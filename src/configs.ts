import * as vscode from 'vscode';

export class Configs {
    private static enabledExtension: boolean = false;

    public static get isExtensionEnabled(): boolean {
        return this.enabledExtension;
    }

    private constructor() {}

    public static activate(context: vscode.ExtensionContext) {
        const extName = 'vibecode';
        const configKey = 'on';

        function isConfigEnabled(): boolean {
            const cfg = vscode.workspace.getConfiguration(extName);
            const inspect = cfg.inspect(configKey);
            return !!(inspect?.globalValue ?? inspect?.defaultValue ?? false);
        }

        function toggleExtensionEnabled() {
            const config = vscode.workspace.getConfiguration(extName);
            const current = isConfigEnabled();
            const newValue = !current;

            config.update(configKey, newValue, vscode.ConfigurationTarget.Global).then(() => {
                const message = `VibeCode is now ${newValue ? 'ON' : 'OFF'}`;
                vscode.window.showInformationMessage(message);
            });
        }

        function onConfigChanged(event: vscode.ConfigurationChangeEvent) {
            if (event.affectsConfiguration(`${extName}.${configKey}`)) {
                Configs.enabledExtension = isConfigEnabled();
            }
        }

        // Set initial value
        Configs.enabledExtension = isConfigEnabled();

        // Register toggle command
        const toggleCommandId = 'vibecode.toggleOn';
        const toggleCommand = vscode.commands.registerCommand(toggleCommandId, toggleExtensionEnabled);
        context.subscriptions.push(toggleCommand);

        // Listen for config changes
        const configSub = vscode.workspace.onDidChangeConfiguration(onConfigChanged);
        context.subscriptions.push(configSub);
    }
}
