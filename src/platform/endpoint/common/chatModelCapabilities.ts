/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { LanguageModelChat } from 'vscode';
import type { IChatEndpoint } from '../../networking/common/networking';


function getSha256Hash(text: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(text);
	return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	});
}

/**
 * Returns whether the instructions should be given in a user message instead
 * of a system message when talking to the model.
 */
export function modelPrefersInstructionsInUserMessage(modelFamily: string) {
	return modelFamily.includes('claude-3.5-sonnet');
}

/**
 * Returns whether the instructions should be presented after the history
 * for the given model.
 */
export function modelPrefersInstructionsAfterHistory(modelFamily: string) {
	return modelFamily.includes('claude-3.5-sonnet');
}

/**
 * Model supports apply_patch as an edit tool.
 */
export async function modelSupportsApplyPatch(model: LanguageModelChat | IChatEndpoint): Promise<boolean> {
	if (model.family === 'gpt-4.1' || model.family === 'o4-mini' || model.family.startsWith('gpt-5')) {
		return true;
	}
	return await getSha256Hash(model.family) === 'a99dd17dfee04155d863268596b7f6dd36d0a6531cd326348dbe7416142a21a3';
}

/**
 * Model prefers JSON notebook representation.
 */
export function modelPrefersJsonNotebookRepresentation(model: LanguageModelChat | IChatEndpoint): boolean {
	return model.family === 'gpt-4.1' || model.family === 'o4-mini' || model.family.startsWith('gpt-5');
}

/**
 * Model supports replace_string_in_file as an edit tool.
 */
export function modelSupportsReplaceString(model: LanguageModelChat | IChatEndpoint): boolean {
	return model.family.startsWith('claude') || model.family.startsWith('Anthropic') || model.family.includes('gemini');
}

/**
 * Model supports multi_replace_string_in_file as an edit tool.
 */
export function modelSupportsMultiReplaceString(model: LanguageModelChat | IChatEndpoint): boolean {
	return modelSupportsReplaceString(model) && !model.family.includes('gemini');
}

/**
 * The model is capable of using replace_string_in_file exclusively,
 * without needing insert_edit_into_file.
 */
export function modelCanUseReplaceStringExclusively(model: LanguageModelChat | IChatEndpoint): boolean {
	return model.family.startsWith('claude') || model.family.startsWith('Anthropic');
}

/**
 * The model can accept image urls as the `image_url` parameter in requests.
 */
export function modelCanUseImageURL(model: LanguageModelChat | IChatEndpoint): boolean {
	return !model.family.startsWith('claude') && !model.family.startsWith('Anthropic');
}

/**
 * The model is capable of using apply_patch as an edit tool exclusively,
 * without needing insert_edit_into_file.
 */
export function modelCanUseApplyPatchExclusively(model: LanguageModelChat | IChatEndpoint): boolean {
	return model.family.startsWith('gpt-5');
}

/**
 * Whether, when replace_string and insert_edit tools are both available,
 * verbiage should be added in the system prompt directing the model to prefer
 * replace_string.
 */
export function modelNeedsStrongReplaceStringHint(model: LanguageModelChat | IChatEndpoint): boolean {
	return model.family.toLowerCase().includes('gemini');
}
