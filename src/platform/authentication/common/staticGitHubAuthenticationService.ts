/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { AuthenticationGetSessionOptions, AuthenticationSession } from 'vscode';
import { IConfigurationService } from '../../configuration/common/configurationService';
import { ILogService } from '../../log/common/logService';
import { BaseAuthenticationService, GITHUB_SCOPE_ALIGNED, GITHUB_SCOPE_USER_EMAIL, IAuthenticationService, MinimalModeError } from './authentication';
import { CopilotToken } from './copilotToken';
import { ICopilotTokenManager } from './copilotTokenManager';
import { ICopilotTokenStore } from './copilotTokenStore';

export class StaticGitHubAuthenticationService extends BaseAuthenticationService {

	private _githubToken: string | undefined;
	get githubToken(): string {
		if (!this._githubToken) {
			this._githubToken = this.tokenProvider();
		}
		return this._githubToken;
	}

	private readonly tokenProvider: { (): string };

	constructor(
		tokenProvider: { (): string },
		@ILogService logService: ILogService,
		@ICopilotTokenStore tokenStore: ICopilotTokenStore,
		@ICopilotTokenManager tokenManager: ICopilotTokenManager,
		@IConfigurationService configurationService: IConfigurationService
	) {
		super(logService, tokenStore, tokenManager, configurationService);
		this.tokenProvider = tokenProvider;

		const that = this;
		this._anyGitHubSession = {
			get id() { return that.githubToken; },
			get accessToken() { return that.githubToken; },
			scopes: GITHUB_SCOPE_USER_EMAIL,
			account: {
				id: 'user',
				label: 'User'
			}
		};

		this._permissiveGitHubSession = {
			get id() { return that.githubToken; },
			get accessToken() { return that.githubToken; },
			scopes: GITHUB_SCOPE_ALIGNED,
			account: {
				id: 'user',
				label: 'User'
			}
		};
	}

	getAnyGitHubSession(_options?: AuthenticationGetSessionOptions): Promise<AuthenticationSession | undefined> {
		return Promise.resolve(this._anyGitHubSession);
	}

	getPermissiveGitHubSession(options: AuthenticationGetSessionOptions): Promise<AuthenticationSession | undefined> {
		if (this.isMinimalMode) {
			if (options.createIfNone || options.forceNewSession) {
				throw new MinimalModeError();
			}
			return Promise.resolve(undefined);
		}
		return Promise.resolve(this._permissiveGitHubSession);
	}

	override async getCopilotToken(force?: boolean): Promise<CopilotToken> {
		return await super.getCopilotToken(force);
	}

	setCopilotToken(token: CopilotToken): void {
		this._tokenStore.copilotToken = token;
		this._onDidAuthenticationChange.fire();
	}


	override getAnyAdoSession(_options?: AuthenticationGetSessionOptions): Promise<AuthenticationSession | undefined> {
		return Promise.resolve(undefined);
	}

	override getAdoAccessTokenBase64(options?: AuthenticationGetSessionOptions): Promise<string | undefined> {
		return Promise.resolve(undefined);
	}
}

export function setCopilotToken(authenticationService: IAuthenticationService, token: CopilotToken): void {
	if (!(authenticationService instanceof StaticGitHubAuthenticationService)) {
		throw new Error('This function should only be used with StaticGitHubAuthenticationService');
	}
	(authenticationService as StaticGitHubAuthenticationService).setCopilotToken(token);
}
