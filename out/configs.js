"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Configs = void 0;
const vscode = __importStar(require("vscode"));
class Configs {
    static enabledExtension = false;
    static get isExtensionEnabled() {
        return this.enabledExtension;
    }
    constructor() { }
    static activate(context) {
        const extName = 'vibecode';
        const configKey = 'on';
        function isConfigEnabled() {
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
        function onConfigChanged(event) {
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
exports.Configs = Configs;
//# sourceMappingURL=configs.js.map