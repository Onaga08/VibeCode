import * as vscode from 'vscode';
import { Configs } from './configs';
import { ColorUtils } from './utils/color';
import { CubicCurve } from './utils/cubic_curve';
import { spawn } from 'child_process';

let extensionContext: vscode.ExtensionContext;
let timeout: NodeJS.Timeout | null;
let decorations: AnimatedDecor[] = [];
let fontFamily: string = 'Verdana';
let lastCursor: vscode.Position | undefined;

export function activate(context: vscode.ExtensionContext) {
    extensionContext = context;
    Configs.activate(context);

    const config = vscode.workspace.getConfiguration('editor');
    fontFamily = config.fontFamily;

    const onTextChangeDisposable = vscode.workspace.onDidChangeTextDocument(onTextChanged);
    context.subscriptions.push(onTextChangeDisposable);
}

export function deactivate() {
    clearAnimationTimeout();
}

function startTimeout() {
    if (timeout) return;
    timeout = setInterval(() => {
        decorations = decorations.filter((e, i) => e.update(i, 30));
        if (decorations.length === 0) clearAnimationTimeout();
    }, 30);
}

function clearAnimationTimeout(): void {
    if (!timeout) return;
    clearInterval(timeout);
    timeout = null;
}

function textToRender(text: string, editor: vscode.TextEditor) {
    if (text === '') return 'DELETE';
    if (text === ' ') return 'SPACE';
    if (text.includes('\n')) return 'ENTER';
    const tabSize = editor.options.tabSize;
    const tabSpace = editor.options.insertSpaces ?? false;
    const spaces = !tabSize ? 0 : parseInt(tabSize.toString());
    const tabs = (tabSpace ? ' ' : '\t').repeat(spaces);
    if (text === tabs) return 'TAB';
    if (text.length > 2) return 'CTRL+V';
    return text.toUpperCase();
}

function playTypingSound() {
    const soundPath = extensionContext.asAbsolutePath('sounds/typewriter.wav');
	spawn('afplay', [soundPath]); // macOS
}

function onTextChanged(e: vscode.TextDocumentChangeEvent): void {
    if (!Configs.isExtensionEnabled) return;
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    if (e.contentChanges.length === 0) return;

    const text = e.contentChanges[0].text;
    const cursor = editor.selection.active;
    if (!cursor) return;
    if (lastCursor && cursor.isEqual(lastCursor)) return;
    lastCursor = cursor;

    playTypingSound();

    const data = textToRender(text, editor);
    const over = text === '' ? 0 : 1;
    const pos = new vscode.Position(cursor.line, cursor.character + over);
    decorations.push(new CharDecor(editor, pos, data));
    // if (Configs.isCursorEnabled) decorations.push(new CursorDecor(editor, pos));

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

interface AnimatedDecor {
    update(index: number, delta: number): boolean;
}

class CharDecor implements AnimatedDecor {
    private readonly totalTimeMs = 400;
    private text: string;
    private textColor: string;
    private shadowColor: string;
    private strokeColor: string;
    private offx: number;
    private offy: number;
    private degs: number;
    private moveDist: number;
    private moveDirX: number;
    private moveDirY: number;
    private fontSize: number;
	private yShift: number;
    private timeMs: number = this.totalTimeMs;
    private ranges: vscode.Range[];
    private editor: vscode.TextEditor;
    private decoration: vscode.TextEditorDecorationType | null;

    constructor(editor: vscode.TextEditor, pos: vscode.Position, text: string) {
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


        const rColor = ColorUtils.saturated(ColorUtils.random());
        this.textColor = ColorUtils.toHexCode(ColorUtils.desaturated(rColor, 0.6));
        this.shadowColor = ColorUtils.toHexCode(rColor);
        

        this.strokeColor = 'white';
		this.yShift = isNearTop ? 20 : 0;

        this.ranges = [new vscode.Range(pos, pos)];
        this.decoration = null;
    }

    public update(index: number, delta: number): boolean {
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

    private createDecoration(index: number): vscode.TextEditorDecorationType {
        const progressInv = this.timeMs / this.totalTimeMs;
        const progress = 1 - progressInv;
        const opacity = CubicCurve.ease.transform(progressInv);
        const scale = 0.5 + CubicCurve.easeInBack.transform(progressInv * 1.2);
        const rawY = this.offy + this.moveDirY * this.moveDist * progress;
		const rawX = this.offx + this.moveDirX * this.moveDist * progress;

		// Clamp values to prevent clipping off-screen (especially top/left)
		const y = Math.max(rawY, -5);  // Never go above -5px
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

class CursorDecor implements AnimatedDecor {
    private readonly totalTimeMs = 400;
    private editor: vscode.TextEditor;
    private ranges: vscode.Range[];
    private timeMs: number = this.totalTimeMs;
    private color: string;
	private yShift: number;
    private decoration: vscode.TextEditorDecorationType | null;

    constructor(editor: vscode.TextEditor, pos: vscode.Position) {
        this.editor = editor;
        this.decoration = null;
        const rColor = ColorUtils.saturated(ColorUtils.random());
        this.color = ColorUtils.toHexCode(ColorUtils.desaturated(rColor, 0.6));
        this.ranges = [new vscode.Range(pos, pos)];
		this.yShift = pos.line < 5 ? 20 : 0;
    }

    public update(index: number, delta: number): boolean {
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

    private createDecoration(index: number): vscode.TextEditorDecorationType {
        const progressInv = this.timeMs / this.totalTimeMs;
        const progress = 1 - progressInv;
        const opacity = CubicCurve.ease.transform(progressInv);
        const scale = 0.5 + CubicCurve.easeInBack.transform(progress);
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

class KeywordDecor implements AnimatedDecor {
    private readonly totalTimeMs = 500;
    private timeMs: number = this.totalTimeMs;
    private editor: vscode.TextEditor;
    private decoration: vscode.TextEditorDecorationType | null;
    private ranges: vscode.Range[];

    constructor(editor: vscode.TextEditor, pos: vscode.Position, keyword: string) {
        this.editor = editor;
        this.ranges = [new vscode.Range(pos, pos.translate(0, keyword.length))];
        this.decoration = null;
    }

    public update(index: number, delta: number): boolean {
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