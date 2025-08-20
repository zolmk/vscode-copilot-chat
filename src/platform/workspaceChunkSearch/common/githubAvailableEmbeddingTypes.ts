/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestType } from '@vscode/copilot-api';
import { createRequestHMAC } from '../../../util/common/crypto';
import { Result } from '../../../util/common/result';
import { CallTracker } from '../../../util/common/telemetryCorrelationId';
import { env } from '../../../util/vs/base/common/process';
import { generateUuid } from '../../../util/vs/base/common/uuid';
import { IAuthenticationService } from '../../authentication/common/authentication';
import { getGithubMetadataHeaders } from '../../chunking/common/chunkingEndpointClientImpl';
import { ConfigKey, IConfigurationService } from '../../configuration/common/configurationService';
import { EmbeddingType } from '../../embeddings/common/embeddingsComputer';
import { ICAPIClientService } from '../../endpoint/common/capiClient';
import { IDomainService } from '../../endpoint/common/domainService';
import { IEnvService } from '../../env/common/envService';
import { ILogService } from '../../log/common/logService';
import { IFetcherService, Response } from '../../networking/common/fetcherService';
import { getRequest } from '../../networking/common/networking';
import { IExperimentationService } from '../../telemetry/common/nullExperimentationService';
import { ITelemetryService } from '../../telemetry/common/telemetry';

export interface AvailableEmbeddingTypes {
	readonly primary: readonly EmbeddingType[];
	readonly deprecated: readonly EmbeddingType[];
}

type GetAvailableTypesError =
	| { type: 'requestFailed'; error: Error }
	| { type: 'unauthorized'; status: 401 | 404 }
	| { type: 'noSession' }
	| { type: 'badResponse'; status: number }
	;

type GetAvailableTypesResult = Result<AvailableEmbeddingTypes, GetAvailableTypesError>;

export class GithubAvailableEmbeddingTypesManager {

	private _cached?: Promise<GetAvailableTypesResult>;

	constructor(
		@ILogService private readonly _logService: ILogService,
		@IAuthenticationService private readonly _authService: IAuthenticationService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@IDomainService private readonly _domainService: IDomainService,
		@ICAPIClientService private readonly _capiClientService: ICAPIClientService,
		@IEnvService private readonly _envService: IEnvService,
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IExperimentationService private readonly _experimentationService: IExperimentationService,
	) {
		this._cached = this._authService.getAnyGitHubSession({ silent: true }).then(session => {
			if (!session) {
				return Result.error<GetAvailableTypesError>({ type: 'noSession' });
			}

			return this.doGetAvailableTypes(session.accessToken);
		});
	}

	private async getAllAvailableTypes(silent: boolean): Promise<GetAvailableTypesResult> {
		if (this._cached) {
			const oldCached = this._cached;
			try {
				const cachedResult = await this._cached;
				if (cachedResult.isOk()) {
					return cachedResult;
				}
			} catch {
				// noop
			}

			if (this._cached === oldCached) {
				this._cached = undefined;
			}
		}

		this._cached ??= (async () => {
			const anySession = await this._authService.getAnyGitHubSession({ silent });
			if (!anySession) {
				return Result.error<GetAvailableTypesError>({ type: 'noSession' });
			}

			const initialResult = await this.doGetAvailableTypes(anySession.accessToken);
			if (initialResult.isOk()) {
				return initialResult;
			}

			const permissiveSession = await this._authService.getPermissiveGitHubSession({ silent, createIfNone: !silent ? true : undefined });
			if (!permissiveSession) {
				return initialResult;
			}
			return this.doGetAvailableTypes(permissiveSession.accessToken);
		})();

		return this._cached;
	}

	private async doGetAvailableTypes(token: string): Promise<GetAvailableTypesResult> {
		let response: Response;
		try {
			response = await getRequest(
				this._fetcherService,
				this._envService,
				this._telemetryService,
				this._domainService,
				this._capiClientService,
				{ type: RequestType.EmbeddingsModels },
				token,
				await createRequestHMAC(env.HMAC_SECRET),
				'copilot-panel',
				generateUuid(),
				undefined,
				getGithubMetadataHeaders(new CallTracker(), this._envService)
			);
		} catch (e) {
			this._logService.error('Error fetching available embedding types', e);
			return Result.error<GetAvailableTypesError>({
				type: 'requestFailed',
				error: e
			});
		}

		if (!response.ok) {
			/* __GDPR__
				"githubAvailableEmbeddingTypes.getAvailableTypes.error" : {
					"owner": "mjbvz",
					"comment": "Information about failed githubAvailableEmbeddingTypes calls",
					"statusCode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The response status code" }
				}
			*/
			this._telemetryService.sendMSFTTelemetryEvent('githubAvailableEmbeddingTypes.getAvailableTypes.error', {}, {
				statusCode: response.status,
			});

			// Also treat 404s as unauthorized since this typically indicates that the user is anonymous
			if (response.status === 401 || response.status === 404) {
				return Result.error<GetAvailableTypesError>({ type: 'unauthorized', status: response.status });
			}

			return Result.error<GetAvailableTypesError>({
				type: 'badResponse',
				status: response.status
			});
		}
		type Model = {
			id: string;
			active: boolean;
		};

		type ModelsResponse = {
			models: Model[];
		};

		const jsonResponse: ModelsResponse = await response.json();

		const primary: EmbeddingType[] = [];
		const deprecated: EmbeddingType[] = [];

		for (const model of jsonResponse.models) {
			const resolvedType = new EmbeddingType(model.id);
			if (model.active === false) {
				deprecated.push(resolvedType);
			} else {
				primary.push(resolvedType);
			}
		}

		/* __GDPR__
			"githubAvailableEmbeddingTypes.getAvailableTypes.success" : {
				"owner": "mjbvz",
				"comment": "Information about successful githubAvailableEmbeddingTypes calls",
				"primaryEmbeddingTypes": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "List of primary embedding types" },
				"deprecatedEmbeddingTypes": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "List of deprecated embedding types" }
			}
		*/
		this._telemetryService.sendMSFTTelemetryEvent('githubAvailableEmbeddingTypes.getAvailableTypes.success', {
			primaryEmbeddingTypes: primary.map(type => type.id).join(','),
			deprecatedEmbeddingTypes: deprecated.map(type => type.id).join(','),
		});

		return Result.ok({ primary, deprecated });
	}

	async getPreferredType(silent: boolean): Promise<EmbeddingType | undefined> {
		const result = await this.getAllAvailableTypes(silent);
		if (!result.isOk()) {
			this._logService.info(`GithubAvailableEmbeddingTypesManager: Could not find any available embedding types. Error: ${result.err.type}`);

			/* __GDPR__
				"githubAvailableEmbeddingTypes.getPreferredType.error" : {
					"owner": "mjbvz",
					"comment": "Information about failed githubAvailableEmbeddingTypes calls",
					"error": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The reason why the request failed" }
				}
			*/
			this._telemetryService.sendMSFTTelemetryEvent('githubAvailableEmbeddingTypes.getPreferredType.error', {
				error: result.err.type,
			});

			return undefined;
		}

		const all = result.val;
		this._logService.info(`GithubAvailableEmbeddingTypesManager: Got embeddings. Primary: ${all.primary.join(',')}. Deprecated: ${all.deprecated.join(',')}`);

		const preference = this._configurationService.getExperimentBasedConfig(ConfigKey.Internal.WorkspacePreferredEmbeddingsModel, this._experimentationService);
		if (preference) {
			const preferred = [...all.primary, ...all.deprecated].find(type => type.id === preference);
			if (preferred) {
				return preferred;
			}
		}

		return all.primary.at(0) ?? all.deprecated.at(0);
	}
}
