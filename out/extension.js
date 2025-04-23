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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const configs_1 = require("./configs");
const color_1 = require("./utils/color");
const cubic_curve_1 = require("./utils/cubic_curve");
const child_process_1 = require("child_process");
let extensionContext;
let timeout;
let decorations = [];
let fontFamily = 'Verdana';
let lastCursor;
function activate(context) {
    extensionContext = context;
    configs_1.Configs.activate(context);
    const config = vscode.workspace.getConfiguration('editor');
    fontFamily = config.fontFamily;
    const onTextChangeDisposable = vscode.workspace.onDidChangeTextDocument(onTextChanged);
    context.subscriptions.push(onTextChangeDisposable);
}
exports.activate = activate;
function deactivate() {
    clearAnimationTimeout();
}
exports.deactivate = deactivate;
function startTimeout() {
    if (timeout)
        return;
    timeout = setInterval(() => {
        decorations = decorations.filter((e, i) => e.update(i, 30));
        if (decorations.length === 0)
            clearAnimationTimeout();
    }, 30);
}
function clearAnimationTimeout() {
    if (!timeout)
        return;
    clearInterval(timeout);
    timeout = null;
}
function textToRender(text, editor) {
    if (text === '')
        return 'DELETE';
    if (text === ' ')
        return 'SPACE';
    if (text.includes('\n'))
        return 'ENTER';
    const tabSize = editor.options.tabSize;
    const tabSpace = editor.options.insertSpaces ?? false;
    const spaces = !tabSize ? 0 : parseInt(tabSize.toString());
    const tabs = (tabSpace ? ' ' : '\t').repeat(spaces);
    if (text === tabs)
        return 'TAB';
    if (text.length > 2)
        return 'CTRL+V';
    return text.toUpperCase();
}
function playTypingSound() {
    const soundPath = extensionContext.asAbsolutePath('sounds/typewriter.wav');
    (0, child_process_1.spawn)('afplay', [soundPath]); // macOS
}
function onTextChanged(e) {
    if (!configs_1.Configs.isExtensionEnabled)
        return;
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    if (e.contentChanges.length === 0)
        return;
    const text = e.contentChanges[0].text;
    const cursor = editor.selection.active;
    if (!cursor)
        return;
    if (lastCursor && cursor.isEqual(lastCursor))
        return;
    lastCursor = cursor;
    playTypingSound();
    const data = textToRender(text, editor);
    const over = text === '' ? 0 : 1;
    const pos = new vscode.Position(cursor.line, cursor.character + over);
    decorations.push(new CharDecor(editor, pos, data));
    if (configs_1.Configs.isCursorEnabled)
        decorations.push(new CursorDecor(editor, pos));
    startTimeout();
    const lineText = editor.document.lineAt(cursor.line).text;
    const words = lineText.slice(0, cursor.character).trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    const jsKeywords = [
        "abstract", "arguments", "await", "boolean", "break", "byte", "case", "catch", "char", "class", "const", "continue",
        "debugger", "default", "delete", "do", "double", "else", "enum", "eval", "export", "extends", "false", "final",
        "finally", "float", "for", "function", "goto", "if", "implements", "import", "in", "instanceof", "int", "interface",
        "let", "long", "native", "new", "null", "package", "private", "protected", "public", "return", "short", "static",
        "super", "switch", "synchronized", "this", "throw", "throws", "transient", "true", "try", "typeof", "var", "void",
        "volatile", "while", "with", "yield"
    ];
    const pythonKeywords = [
        "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def",
        "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda",
        "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield"
    ];
    const language = editor.document.languageId;
    const staticKeywords = language === 'python' ? pythonKeywords : jsKeywords;
    if (staticKeywords.includes(lastWord)) {
        const keywordStart = cursor.character - lastWord.length;
        const keywordPos = new vscode.Position(cursor.line, keywordStart);
        decorations.push(new KeywordDecor(editor, keywordPos, lastWord));
    }
}
class CharDecor {
    totalTimeMs = 400;
    text;
    textColor;
    shadowColor;
    strokeColor;
    offx;
    offy;
    degs;
    moveDist;
    moveDirX;
    moveDirY;
    fontSize;
    yShift;
    timeMs = this.totalTimeMs;
    ranges;
    editor;
    decoration;
    constructor(editor, pos, text) {
        this.text = text;
        this.editor = editor;
        this.fontSize = 24;
        this.offy = ((Math.random() - 0.2) * 20) - 10;
        this.offx = ((Math.random() - 0.2) * 30);
        this.degs = (Math.random() - 0.5) * 20;
        this.moveDist = Math.random() * 10;
        this.moveDirX = (Math.random() - 0.5) * 2;
        this.moveDirY = (Math.random() / 2 + 0.5) * -5;
        const isNearTop = pos.line < 5;
        if (isNearTop) {
            this.offy = Math.abs(this.offy); // move down instead of up
            this.moveDirY = Math.abs(this.moveDirY);
        }
        if (configs_1.Configs.isGrayscaleEnabled) {
            const rColor = color_1.ColorUtils.randomGrayscale();
            this.textColor = color_1.ColorUtils.toHexCode(rColor);
            this.shadowColor = color_1.ColorUtils.toHexCode(rColor);
        }
        else {
            const rColor = color_1.ColorUtils.saturated(color_1.ColorUtils.random());
            this.textColor = color_1.ColorUtils.toHexCode(color_1.ColorUtils.desaturated(rColor, 0.6));
            this.shadowColor = color_1.ColorUtils.toHexCode(rColor);
        }
        this.strokeColor = 'white';
        this.yShift = isNearTop ? 20 : 0;
        this.ranges = [new vscode.Range(pos, pos)];
        this.decoration = null;
    }
    update(index, delta) {
        this.timeMs -= delta;
        if (this.timeMs < 0) {
            this.decoration?.dispose();
            return false;
        }
        this.decoration?.dispose();
        this.decoration = this.createDecoration(index + 1);
        this.editor.setDecorations(this.decoration, this.ranges);
        return true;
    }
    createDecoration(index) {
        const progressInv = this.timeMs / this.totalTimeMs;
        const progress = 1 - progressInv;
        const opacity = cubic_curve_1.CubicCurve.ease.transform(progressInv);
        const scale = 0.5 + cubic_curve_1.CubicCurve.easeInBack.transform(progressInv * 1.2);
        const rawY = this.offy + this.moveDirY * this.moveDist * progress;
        const rawX = this.offx + this.moveDirX * this.moveDist * progress;
        // Clamp values to prevent clipping off-screen (especially top/left)
        const y = Math.max(rawY, -5); // Never go above -5px
        const x = Math.max(rawX, -10); // Never go too far left
        const translateY = this.yShift > 0 ? '-50%' : '-150%';
        const style = `
            none;
            position: absolute;
            top: ${y}px;
            margin-left: ${x}px;
            display: inline-block;
            z-index: ${index};
            opacity: ${opacity};
            pointer-events: none;
            transform: translate(-50%, ${translateY}) rotate(${this.degs}deg) scale(${scale});
            color: ${this.textColor};
            text-align: center;
            text-shadow: 0px 0px 4px ${this.shadowColor};
            -webkit-text-stroke: 1px ${this.strokeColor};
            text-stroke: 1px ${this.strokeColor};
            font-size: ${this.fontSize}px;
            font-weight: bold;
            font-family: ${fontFamily}, Verdana;`;
        return vscode.window.createTextEditorDecorationType({
            before: {
                contentText: this.text,
                textDecoration: style,
            },
        });
    }
}
class CursorDecor {
    totalTimeMs = 400;
    editor;
    ranges;
    timeMs = this.totalTimeMs;
    color;
    yShift;
    decoration;
    constructor(editor, pos) {
        this.editor = editor;
        this.decoration = null;
        const rColor = color_1.ColorUtils.saturated(color_1.ColorUtils.random());
        this.color = color_1.ColorUtils.toHexCode(color_1.ColorUtils.desaturated(rColor, 0.6));
        this.ranges = [new vscode.Range(pos, pos)];
        this.yShift = pos.line < 5 ? 20 : 0;
    }
    update(index, delta) {
        this.timeMs -= delta;
        if (this.timeMs < 0) {
            this.decoration?.dispose();
            return false;
        }
        this.decoration?.dispose();
        this.decoration = this.createDecoration(index + 1);
        this.editor.setDecorations(this.decoration, this.ranges);
        return true;
    }
    createDecoration(index) {
        const progressInv = this.timeMs / this.totalTimeMs;
        const progress = 1 - progressInv;
        const opacity = cubic_curve_1.CubicCurve.ease.transform(progressInv);
        const scale = 0.5 + cubic_curve_1.CubicCurve.easeInBack.transform(progress);
        const translateY = this.yShift > 0 ? '50%' : '-30%';
        const style = `
            none;
            position: absolute;
            top: ${this.yShift}px;
            margin-left: 0px;
            width: 50px;
            height: 50px;
            z-index: ${index};
            background: url('data:image/png;base64,iVBOR...');
            background-repeat: no-repeat;
            background-size: 100% 100%;
            opacity: ${opacity};
            transform: translate(-50%, ${translateY}) scale(${scale})`;
        return vscode.window.createTextEditorDecorationType({
            after: {
                contentText: '',
                textDecoration: style,
            },
        });
    }
}
class KeywordDecor {
    totalTimeMs = 500;
    timeMs = this.totalTimeMs;
    editor;
    decoration;
    ranges;
    constructor(editor, pos, keyword) {
        this.editor = editor;
        this.ranges = [new vscode.Range(pos, pos.translate(0, keyword.length))];
        this.decoration = null;
    }
    update(index, delta) {
        this.timeMs -= delta;
        if (this.timeMs < 0) {
            this.decoration?.dispose();
            return false;
        }
        this.decoration?.dispose();
        const colors = ['#ff6f00', '#1269f3'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        this.decoration = vscode.window.createTextEditorDecorationType({
            color: color,
            fontWeight: 'bold',
            backgroundColor: 'rgba(255,255,255,0.05)', // just a soft flash
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
        });
        this.editor.setDecorations(this.decoration, this.ranges);
        setTimeout(() => {
            this.decoration?.dispose();
        }, 300);
        return true;
    }
}
//# sourceMappingURL=extension.js.map