/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CopilotTokenStore, ICopilotTokenStore } from '../../../platform/authentication/common/copilotTokenStore';
import { BlockedExtensionService, IBlockedExtensionService } from '../../../platform/chat/common/blockedExtensionService';
import { IChatMLFetcher } from '../../../platform/chat/common/chatMLFetcher';
import { IChatSessionService } from '../../../platform/chat/common/chatSessionService';
import { TestChatSessionService } from '../../../platform/chat/test/common/testChatSessionService';
import { INaiveChunkingService, NaiveChunkingService } from '../../../platform/chunking/node/naiveChunkerService';
import { MockRunCommandExecutionService } from '../../../platform/commands/common/mockRunCommandExecutionService';
import { IRunCommandExecutionService } from '../../../platform/commands/common/runCommandExecutionService';
import { IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { DefaultsOnlyConfigurationService } from '../../../platform/configuration/test/common/defaultsOnlyConfigurationService';
import { IDebugOutputService } from '../../../platform/debug/common/debugOutputService';
import { DebugOutputServiceImpl } from '../../../platform/debug/vscode/debugOutputServiceImpl';
import { IDialogService } from '../../../platform/dialog/common/dialogService';
import { IDiffService } from '../../../platform/diff/common/diffService';
import { DiffServiceImpl } from '../../../platform/diff/node/diffServiceImpl';
import { IEmbeddingsComputer } from '../../../platform/embeddings/common/embeddingsComputer';
import { RemoteEmbeddingsComputer } from '../../../platform/embeddings/common/remoteEmbeddingsComputer';
import { ICAPIClientService } from '../../../platform/endpoint/common/capiClient';
import { IDomainService } from '../../../platform/endpoint/common/domainService';
import { IEndpointProvider } from '../../../platform/endpoint/common/endpointProvider';
import { CAPIClientImpl } from '../../../platform/endpoint/node/capiClientImpl';
import { DomainService } from '../../../platform/endpoint/node/domainServiceImpl';
import { TestEndpointProvider } from '../../../platform/endpoint/test/node/testEndpointProvider';
import { IEnvService } from '../../../platform/env/common/envService';
import { EnvServiceImpl } from '../../../platform/env/vscode/envServiceImpl';
import { IVSCodeExtensionContext } from '../../../platform/extContext/common/extensionContext';
import { IExtensionsService } from '../../../platform/extensions/common/extensionsService';
import { VSCodeExtensionsService } from '../../../platform/extensions/vscode/extensionsService';
import { IGitDiffService } from '../../../platform/git/common/gitDiffService';
import { IGitExtensionService } from '../../../platform/git/common/gitExtensionService';
import { IGitService } from '../../../platform/git/common/gitService';
import { GitExtensionServiceImpl } from '../../../platform/git/vscode/gitExtensionServiceImpl';
import { GitServiceImpl } from '../../../platform/git/vscode/gitServiceImpl';
import { IOctoKitService } from '../../../platform/github/common/githubService';
import { OctoKitService } from '../../../platform/github/common/octoKitServiceImpl';
import { IIgnoreService, NullIgnoreService } from '../../../platform/ignore/common/ignoreService';
import { IImageService, nullImageService } from '../../../platform/image/common/imageService';
import { ILanguageDiagnosticsService } from '../../../platform/languages/common/languageDiagnosticsService';
import { ILanguageFeaturesService, NoopLanguageFeaturesService } from '../../../platform/languages/common/languageFeaturesService';
import { LanguageDiagnosticsServiceImpl } from '../../../platform/languages/vscode/languageDiagnosticsServiceImpl';
import { EditLogService, IEditLogService } from '../../../platform/multiFileEdit/common/editLogService';
import { IMultiFileEditInternalTelemetryService, MultiFileEditInternalTelemetryService } from '../../../platform/multiFileEdit/common/multiFileEditQualityTelemetry';
import { ICompletionsFetchService } from '../../../platform/nesFetch/common/completionsFetchService';
import { CompletionsFetchService } from '../../../platform/nesFetch/node/completionsFetchServiceImpl';
import { IAlternativeNotebookContentService } from '../../../platform/notebook/common/alternativeContent';
import { AlternativeNotebookContentEditGenerator, IAlternativeNotebookContentEditGenerator } from '../../../platform/notebook/common/alternativeContentEditGenerator';
import { MockAlternativeNotebookContentService } from '../../../platform/notebook/common/mockAlternativeContentService';
import { INotebookService } from '../../../platform/notebook/common/notebookService';
import { INotificationService, NullNotificationService } from '../../../platform/notification/common/notificationService';
import { IPromptPathRepresentationService, PromptPathRepresentationService } from '../../../platform/prompts/common/promptPathRepresentationService';
import { IRemoteRepositoriesService, RemoteRepositoriesService } from '../../../platform/remoteRepositories/vscode/remoteRepositories';
import { NullRequestLogger } from '../../../platform/requestLogger/node/nullRequestLogger';
import { IRequestLogger } from '../../../platform/requestLogger/node/requestLogger';
import { IReviewService } from '../../../platform/review/common/reviewService';
import { IScopeSelector } from '../../../platform/scopeSelection/common/scopeSelection';
import { ScopeSelectorImpl } from '../../../platform/scopeSelection/vscode-node/scopeSelectionImpl';
import { ISearchService } from '../../../platform/search/common/searchService';
import { SearchServiceImpl } from '../../../platform/search/vscode-node/searchServiceImpl';
import { ISimulationTestContext, NulSimulationTestContext } from '../../../platform/simulationTestContext/common/simulationTestContext';
import { ITabsAndEditorsService } from '../../../platform/tabs/common/tabsAndEditorsService';
import { TabsAndEditorsServiceImpl } from '../../../platform/tabs/vscode/tabsAndEditorsServiceImpl';
import { NullTelemetryService } from '../../../platform/telemetry/common/nullTelemetryService';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry';
import { ITerminalService } from '../../../platform/terminal/common/terminalService';
import { TerminalServiceImpl } from '../../../platform/terminal/vscode/terminalServiceImpl';
import { MockExtensionContext } from '../../../platform/test/node/extensionContext';
import { _createBaselineServices, TestingServiceCollection } from '../../../platform/test/node/services';
import { SimulationNotebookService, SimulationReviewService, TestingDialogService } from '../../../platform/test/node/simulationWorkspaceServices';
import { ITestProvider } from '../../../platform/testing/common/testProvider';
import { IWorkspaceMutationManager } from '../../../platform/testing/common/workspaceMutationManager';
import { ISetupTestsDetector, NullSetupTestsDetector } from '../../../platform/testing/node/setupTestDetector';
import { TestProvider } from '../../../platform/testing/vscode/testProviderImpl';
import { IThinkingDataService, ThinkingDataImpl } from '../../../platform/thinking/node/thinkingDataService';
import { ITokenizerProvider, TokenizerProvider } from '../../../platform/tokenizer/node/tokenizer';
import { IWorkspaceService } from '../../../platform/workspace/common/workspaceService';
import { ExtensionTextDocumentManager } from '../../../platform/workspace/vscode/workspaceServiceImpl';
import { SyncDescriptor } from '../../../util/vs/platform/instantiation/common/descriptors';
import { CommandServiceImpl, ICommandService } from '../../commands/node/commandService';
import { IPromptWorkspaceLabels, PromptWorkspaceLabels } from '../../context/node/resolvers/promptWorkspaceLabels';
import { IUserFeedbackService, UserFeedbackService } from '../../conversation/vscode-node/userActions';
import { ConversationStore, IConversationStore } from '../../conversationStore/node/conversationStore';
import { ITestGenInfoStorage, TestGenInfoStorage } from '../../intents/node/testIntent/testInfoStorage';
import { ILinkifyService, LinkifyService } from '../../linkify/common/linkifyService';
import { ILaunchConfigService } from '../../onboardDebug/common/launchConfigService';
import { DebugCommandToConfigConverter, IDebugCommandToConfigConverter } from '../../onboardDebug/node/commandToConfigConverter';
import { DebuggableCommandIdentifier, IDebuggableCommandIdentifier } from '../../onboardDebug/node/debuggableCommandIdentifier';
import { ILanguageToolsProvider, LanguageToolsProvider } from '../../onboardDebug/node/languageToolsProvider';
import { LaunchConfigService } from '../../onboardDebug/vscode/launchConfigService';
import { ChatMLFetcherImpl } from '../../prompt/node/chatMLFetcher';
import { IFeedbackReporter, NullFeedbackReporterImpl } from '../../prompt/node/feedbackReporter';
import { IPromptVariablesService } from '../../prompt/node/promptVariablesService';
import { ITodoListContextProvider, TodoListContextProvider } from '../../prompt/node/todoListContextProvider';
import { GitDiffService } from '../../prompt/vscode-node/gitDiffService';
import { PromptVariablesServiceImpl } from '../../prompt/vscode-node/promptVariablesService';
import { CodeMapperService, ICodeMapperService } from '../../prompts/node/codeMapper/codeMapperService';
import { FixCookbookService, IFixCookbookService } from '../../prompts/node/inline/fixCookbookService';
import { WorkspaceMutationManager } from '../../testing/node/setupTestsFileManager';
import { IToolsService, NullToolsService } from '../../tools/common/toolsService';
import { ToolGroupingService } from '../../tools/common/virtualTools/toolGroupingService';
import { ToolGroupingCache } from '../../tools/common/virtualTools/virtualToolGroupCache';
import { IToolGroupingCache, IToolGroupingService } from '../../tools/common/virtualTools/virtualToolTypes';

/**
 * A default context for VSCode extension testing, building on general one in `lib`.
 * Only includes items that are needed for almost all extension tests.
 */
export function createExtensionTestingServices(): TestingServiceCollection {
	const testingServiceCollection = _createBaselineServices();
	testingServiceCollection.define(IConfigurationService, new SyncDescriptor(DefaultsOnlyConfigurationService));
	testingServiceCollection.define(IEnvService, new SyncDescriptor(TestEnvService));
	testingServiceCollection.define(ISimulationTestContext, new SyncDescriptor(NulSimulationTestContext));
	testingServiceCollection.define(IRequestLogger, new SyncDescriptor(NullRequestLogger));
	testingServiceCollection.define(IFeedbackReporter, new SyncDescriptor(NullFeedbackReporterImpl));
	testingServiceCollection.define(IEndpointProvider, new SyncDescriptor(TestEndpointProvider, [undefined, undefined, undefined, undefined, false, undefined]));
	testingServiceCollection.define(ICopilotTokenStore, new SyncDescriptor(CopilotTokenStore));
	testingServiceCollection.define(IDomainService, new SyncDescriptor(DomainService));
	testingServiceCollection.define(ICAPIClientService, new SyncDescriptor(CAPIClientImpl));
	testingServiceCollection.define(INotificationService, new SyncDescriptor(NullNotificationService));
	testingServiceCollection.define(ICommandService, new SyncDescriptor(CommandServiceImpl));
	testingServiceCollection.define(IPromptVariablesService, new SyncDescriptor(PromptVariablesServiceImpl));
	testingServiceCollection.define(IVSCodeExtensionContext, new SyncDescriptor(MockExtensionContext));
	testingServiceCollection.define(IIgnoreService, new SyncDescriptor(NullIgnoreService));
	testingServiceCollection.define(IRemoteRepositoriesService, new SyncDescriptor(RemoteRepositoriesService));
	testingServiceCollection.define(IWorkspaceService, new SyncDescriptor(ExtensionTextDocumentManager));
	testingServiceCollection.define(IExtensionsService, new SyncDescriptor(VSCodeExtensionsService));
	testingServiceCollection.define(IChatMLFetcher, new SyncDescriptor(ChatMLFetcherImpl));
	testingServiceCollection.define(IImageService, nullImageService);
	testingServiceCollection.define(ITabsAndEditorsService, new SyncDescriptor(TabsAndEditorsServiceImpl));
	testingServiceCollection.define(IEmbeddingsComputer, new SyncDescriptor(RemoteEmbeddingsComputer));
	testingServiceCollection.define(ITelemetryService, new SyncDescriptor(NullTelemetryService));
	testingServiceCollection.define(ILanguageDiagnosticsService, new SyncDescriptor(LanguageDiagnosticsServiceImpl));
	testingServiceCollection.define(ITokenizerProvider, new SyncDescriptor(TokenizerProvider, [true]));
	testingServiceCollection.define(IPromptWorkspaceLabels, new SyncDescriptor(PromptWorkspaceLabels));
	testingServiceCollection.define(IGitDiffService, new SyncDescriptor(GitDiffService));
	testingServiceCollection.define(IGitExtensionService, new SyncDescriptor(GitExtensionServiceImpl));
	testingServiceCollection.define(IGitService, new SyncDescriptor(GitServiceImpl));
	testingServiceCollection.define(IOctoKitService, new SyncDescriptor(OctoKitService));
	testingServiceCollection.define(ISetupTestsDetector, new SyncDescriptor(NullSetupTestsDetector));
	testingServiceCollection.define(IWorkspaceMutationManager, new SyncDescriptor(WorkspaceMutationManager));
	testingServiceCollection.define(ITestProvider, new SyncDescriptor(TestProvider));
	testingServiceCollection.define(INaiveChunkingService, new SyncDescriptor(NaiveChunkingService));
	testingServiceCollection.define(ILinkifyService, new SyncDescriptor(LinkifyService));
	testingServiceCollection.define(ITestGenInfoStorage, new SyncDescriptor(TestGenInfoStorage));
	testingServiceCollection.define(IDebugCommandToConfigConverter, new SyncDescriptor(DebugCommandToConfigConverter));
	testingServiceCollection.define(ILaunchConfigService, new SyncDescriptor(LaunchConfigService));
	testingServiceCollection.define(IDebuggableCommandIdentifier, new SyncDescriptor(DebuggableCommandIdentifier));
	testingServiceCollection.define(ILanguageToolsProvider, new SyncDescriptor(LanguageToolsProvider));
	testingServiceCollection.define(IEditLogService, new SyncDescriptor(EditLogService));
	testingServiceCollection.define(IMultiFileEditInternalTelemetryService, new SyncDescriptor(MultiFileEditInternalTelemetryService));
	testingServiceCollection.define(ICodeMapperService, new SyncDescriptor(CodeMapperService));
	testingServiceCollection.define(IAlternativeNotebookContentService, new SyncDescriptor(MockAlternativeNotebookContentService));
	testingServiceCollection.define(IAlternativeNotebookContentEditGenerator, new SyncDescriptor(AlternativeNotebookContentEditGenerator));
	testingServiceCollection.define(IDiffService, new SyncDescriptor(DiffServiceImpl));
	testingServiceCollection.define(ICompletionsFetchService, new SyncDescriptor(CompletionsFetchService));
	testingServiceCollection.define(IDebugOutputService, new SyncDescriptor(DebugOutputServiceImpl));
	testingServiceCollection.define(IUserFeedbackService, new SyncDescriptor(UserFeedbackService));
	testingServiceCollection.define(ITerminalService, new SyncDescriptor(TerminalServiceImpl));
	testingServiceCollection.define(IConversationStore, new SyncDescriptor(ConversationStore));
	testingServiceCollection.define(IFixCookbookService, new SyncDescriptor(FixCookbookService));
	testingServiceCollection.define(IReviewService, new SyncDescriptor(SimulationReviewService));
	testingServiceCollection.define(IBlockedExtensionService, new SyncDescriptor(BlockedExtensionService));
	testingServiceCollection.define(IDialogService, new SyncDescriptor(TestingDialogService));
	testingServiceCollection.define(ILanguageFeaturesService, new SyncDescriptor(NoopLanguageFeaturesService));
	testingServiceCollection.define(IScopeSelector, new SyncDescriptor(ScopeSelectorImpl));
	testingServiceCollection.define(IPromptPathRepresentationService, new SyncDescriptor(PromptPathRepresentationService));
	testingServiceCollection.define(IToolsService, new SyncDescriptor(NullToolsService));
	testingServiceCollection.define(IChatSessionService, new SyncDescriptor(TestChatSessionService));
	testingServiceCollection.define(INotebookService, new SyncDescriptor(SimulationNotebookService));
	testingServiceCollection.define(IThinkingDataService, new SyncDescriptor(ThinkingDataImpl));
	testingServiceCollection.define(IRunCommandExecutionService, new SyncDescriptor(MockRunCommandExecutionService));
	testingServiceCollection.define(ISearchService, new SyncDescriptor(SearchServiceImpl));
	testingServiceCollection.define(IToolGroupingCache, new SyncDescriptor(ToolGroupingCache));
	testingServiceCollection.define(IToolGroupingService, new SyncDescriptor(ToolGroupingService));
	testingServiceCollection.define(ITodoListContextProvider, new SyncDescriptor(TodoListContextProvider));

	return testingServiceCollection;
}

class TestEnvService extends EnvServiceImpl {
	override get sessionId(): string {
		return 'test-session';
	}

	override get machineId(): string {
		return 'test-machine';
	}

}
