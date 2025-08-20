/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { CancellationToken } from 'vscode';
import { IAuthenticationService } from '../../src/platform/authentication/common/authentication';
import { ComputeEmbeddingsOptions, Embedding, EmbeddingType, EmbeddingVector, Embeddings, LEGACY_EMBEDDING_MODEL_ID, getWellKnownEmbeddingTypeInfo } from '../../src/platform/embeddings/common/embeddingsComputer';
import { RemoteEmbeddingsComputer } from '../../src/platform/embeddings/common/remoteEmbeddingsComputer';
import { ICAPIClientService } from '../../src/platform/endpoint/common/capiClient';
import { IDomainService } from '../../src/platform/endpoint/common/domainService';
import { IEnvService } from '../../src/platform/env/common/envService';
import { IFetcherService } from '../../src/platform/networking/common/fetcherService';
import { ITelemetryService } from '../../src/platform/telemetry/common/telemetry';
import { computeSHA256 } from './hash';

export class CacheableEmbeddingRequest {
	public readonly hash: string;
	public readonly query: string;
	public readonly model: LEGACY_EMBEDDING_MODEL_ID;

	constructor(
		embeddingQuery: string,
		model: LEGACY_EMBEDDING_MODEL_ID
	) {
		this.query = embeddingQuery;
		this.model = model;
		this.hash = computeSHA256(this.query + model);
	}

	toJSON() {
		return {
			query: this.query,
			model: this.model,
		};
	}
}

export interface IEmbeddingsCache {
	get(queryHash: CacheableEmbeddingRequest): Promise<EmbeddingVector | undefined>;
	set(queryHash: CacheableEmbeddingRequest, embedding: EmbeddingVector): Promise<void>;
}

export class CachingEmbeddingsComputer extends RemoteEmbeddingsComputer {
	constructor(
		private readonly cache: IEmbeddingsCache,
		@IAuthenticationService authService: IAuthenticationService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IDomainService domainService: IDomainService,
		@ICAPIClientService capiClientService: ICAPIClientService,
		@IEnvService envService: IEnvService,
		@IFetcherService fetcherService: IFetcherService
	) {
		super(
			authService,
			telemetryService,
			domainService,
			capiClientService,
			envService,
			fetcherService
		);
	}

	public override async computeEmbeddings(
		type: EmbeddingType,
		inputs: string[],
		options: ComputeEmbeddingsOptions,
		cancellationToken: CancellationToken | undefined,
	): Promise<Embeddings | undefined> {
		const embeddingEntries = new Map<string, Embedding>();
		const nonCached: string[] = [];

		const model = getWellKnownEmbeddingTypeInfo(type)?.model;
		if (!model) {
			throw new Error(`Unknown embedding type: ${type.id}`);
		}

		for (const input of inputs) {
			const embeddingRequest = new CacheableEmbeddingRequest(input, model);
			const cacheEntry = await this.cache.get(embeddingRequest);
			if (!cacheEntry) {
				nonCached.push(embeddingRequest.query);
			} else {
				embeddingEntries.set(embeddingRequest.query, { type, value: cacheEntry });
			}
		}

		if (nonCached.length) {
			const embeddingsResult = await super.computeEmbeddings(type, nonCached, options, cancellationToken);
			if (!embeddingsResult) {
				return undefined;
			}

			// Update the cache with the newest entries
			for (let i = 0; i < nonCached.length; i++) {
				const embeddingRequest = new CacheableEmbeddingRequest(nonCached[i], model);
				const embedding = embeddingsResult.values[i];
				embeddingEntries.set(embeddingRequest.query, embedding);
				await this.cache.set(embeddingRequest, embedding.value);
			}
		}

		// This reconstructs the output array such that each embedding is at the right index to match the input array
		const out: Embedding[] = [];
		for (const input of inputs) {
			const embedding = embeddingEntries.get(input);
			if (!embedding) {
				return undefined;
			}
			out.push(embedding);
		}
		return { type, values: out };
	}
}
