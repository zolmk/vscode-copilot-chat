/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IFileSystemService } from '../../../platform/filesystem/common/fileSystemService';
import { FileType } from '../../../platform/filesystem/common/fileTypes';
import { IWorkspaceService } from '../../../platform/workspace/common/workspaceService';
import { CancellationToken } from '../../../util/vs/base/common/cancellation';
import { hasDriveLetter } from '../../../util/vs/base/common/extpath';
import { Schemas } from '../../../util/vs/base/common/network';
import * as path from '../../../util/vs/base/common/path';
import { isWindows } from '../../../util/vs/base/common/platform';
import * as resources from '../../../util/vs/base/common/resources';
import { isUriComponents } from '../../../util/vs/base/common/uri';
import { Uri } from '../../../vscodeTypes';
import { coalesceParts, LinkifiedPart, LinkifiedText, LinkifyLocationAnchor } from './linkifiedText';
import { IContributedLinkifier, LinkifierContext } from './linkifyService';

// Create a single regex which runs different regexp parts in a big `|` expression.
const pathMatchRe = new RegExp(
	[
		// [path/to/file.md](path/to/file.md) or [`path/to/file.md`](path/to/file.md)
		/\[(`?)(?<mdLinkText>[^`\]\)\n]+)\1\]\((?<mdLinkPath>[^`\s]+)\)/.source,

		// Inline code paths
		/(?<!\[)`(?<inlineCodePath>[^`\s]+)`(?!\])/.source,

		// File paths rendered as plain text
		/(?<![\[`()<])(?<plainTextPath>[^\s`*]+\.[^\s`*]+)(?![\]`])/.source
	].join('|'),
	'gu');

/**
 * Linkifies file paths in responses. This includes:
 *
 * ```
 * [file.md](file.md)
 * `file.md`
 * ```
 */
export class FilePathLinkifier implements IContributedLinkifier {

	constructor(
		@IFileSystemService private readonly fileSystem: IFileSystemService,
		@IWorkspaceService private readonly workspaceService: IWorkspaceService,
	) { }

	async linkify(text: string, context: LinkifierContext, token: CancellationToken): Promise<LinkifiedText> {
		const parts: Array<Promise<LinkifiedPart> | LinkifiedPart> = [];

		let endLastMatch = 0;
		for (const match of text.matchAll(pathMatchRe)) {
			const prefix = text.slice(endLastMatch, match.index);
			if (prefix) {
				parts.push(prefix);
			}

			const matched = match[0];

			let pathText: string | undefined;

			// For a md style link, require that the text and path are the same
			// However we have to have extra logic since the path may be encoded: `[file name](file%20name)`
			if (match.groups?.['mdLinkPath']) {
				let mdLinkPath = match.groups?.['mdLinkPath'];
				try {
					mdLinkPath = decodeURIComponent(mdLinkPath);
				} catch {
					// noop
				}

				if (mdLinkPath !== match.groups?.['mdLinkText']) {
					pathText = undefined;
				} else {
					pathText = mdLinkPath;
				}
			}
			pathText ??= match.groups?.['inlineCodePath'] ?? match.groups?.['plainTextPath'] ?? '';

			parts.push(this.resolvePathText(pathText, context)
				.then(uri => uri ? new LinkifyLocationAnchor(uri) : matched));

			endLastMatch = match.index + matched.length;
		}

		const suffix = text.slice(endLastMatch);
		if (suffix) {
			parts.push(suffix);
		}

		return { parts: coalesceParts(await Promise.all(parts)) };
	}

	private async resolvePathText(pathText: string, context: LinkifierContext): Promise<Uri | undefined> {
		const workspaceFolders = this.workspaceService.getWorkspaceFolders();

		// Don't linkify very short paths such as '/' or special paths such as '../'
		if (pathText.length < 2 || ['../', '..\\', '/.', '\\.', '..'].includes(pathText)) {
			return;
		}

		if (pathText.startsWith('/') || (isWindows && (pathText.startsWith('\\') || hasDriveLetter(pathText)))) {
			try {
				const uri = await this.statAndNormalizeUri(Uri.file(pathText.startsWith('/') ? path.posix.normalize(pathText) : path.normalize(pathText)));
				if (uri) {
					if (path.posix.normalize(uri.path) === '/') {
						return undefined;
					}

					return uri;
				}
			} catch {
				// noop
			}
		}

		// Handle paths that look like uris
		const scheme = pathText.match(/^([a-z]+):/i)?.[1];
		if (scheme) {
			try {
				const uri = Uri.parse(pathText);
				if (uri.scheme === Schemas.file || workspaceFolders.some(folder => folder.scheme === uri.scheme && folder.authority === uri.authority)) {
					const statedUri = await this.statAndNormalizeUri(uri);
					if (statedUri) {
						return statedUri;
					}
				}
			} catch {
				// Noop, parsing error
			}
			return;
		}

		for (const workspaceFolder of workspaceFolders) {
			const uri = await this.statAndNormalizeUri(Uri.joinPath(workspaceFolder, pathText));
			if (uri) {
				return uri;
			}
		}

		// Then fallback to checking references based on filename
		const name = path.basename(pathText);
		const refUri = context.references
			.map(ref => {
				if ('variableName' in ref.anchor) {
					return isUriComponents(ref.anchor.value) ? ref.anchor.value : ref.anchor.value?.uri;
				}
				return isUriComponents(ref.anchor) ? ref.anchor : ref.anchor.uri;
			})
			.filter((item): item is Uri => !!item)
			.find(refUri => resources.basename(refUri) === name);

		return refUri;
	}

	private async statAndNormalizeUri(uri: Uri): Promise<Uri | undefined> {
		try {
			const stat = await this.fileSystem.stat(uri);
			if (stat.type === FileType.Directory) {
				// Ensure all dir paths have a trailing slash for icon rendering
				return uri.path.endsWith('/') ? uri : uri.with({ path: `${uri.path}/` });
			}

			return uri;
		} catch {
			return undefined;
		}
	}
}
