"use client";
import { useEffect, useRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
  keymap,
} from "@codemirror/view";
import { xml } from "@codemirror/lang-xml";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
} from "@codemirror/language";
import { lintGutter, setDiagnostics } from "@codemirror/lint";
import type { ValidationIssue } from "@/types/validation";
type Props = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  issues?: ValidationIssue[];
  focus?: { line: number; nonce: number };
};
export function XmlEditor({
  value,
  onChange,
  readOnly = false,
  issues = [],
  focus,
}: Props) {
  const parent = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    callback = useRef(onChange),
    mode = useRef(new Compartment()),
    syncing = useRef(false);
  useEffect(() => {
    callback.current = onChange;
  }, [onChange]);
  useEffect(() => {
    if (!parent.current) return;
    const editor = new EditorView({
      parent: parent.current,
      state: EditorState.create({
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          bracketMatching(),
          xml(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          lintGutter(),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
            indentWithTab,
          ]),
          mode.current.of([
            EditorState.readOnly.of(false),
            EditorView.editable.of(true),
          ]),
          EditorView.contentAttributes.of({
            "aria-label": "Código XML",
            "data-testid": "xml-editor",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !syncing.current)
              callback.current(update.state.doc.toString());
          }),
          EditorView.theme({
            "&": {
              height: "480px",
              fontSize: "12px",
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
            },
            ".cm-scroller": { overflow: "auto", fontFamily: "monospace" },
            ".cm-gutters": {
              backgroundColor: "var(--muted)",
              color: "var(--muted-foreground)",
              border: "none",
            },
            ".cm-activeLine": {
              backgroundColor:
                "color-mix(in srgb, var(--primary) 5%, transparent)",
            },
            ".cm-content": { padding: "12px 0" },
            "&.cm-focused": { outline: "2px solid var(--primary)" },
            ".cm-tooltip": {
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
            },
            ".cm-cursor": { borderLeftColor: "var(--foreground)" },
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, []);
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      syncing.current = true;
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
      });
      syncing.current = false;
    }
  }, [value]);
  useEffect(() => {
    view.current?.dispatch({
      effects: mode.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    });
  }, [readOnly]);
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    editor.dispatch(
      setDiagnostics(
        editor.state,
        issues
          .filter((i) => i.line && i.line <= editor.state.doc.lines)
          .map((i) => {
            const line = editor.state.doc.line(i.line!);
            return {
              from: line.from,
              to: line.to,
              severity:
                i.severity === "error"
                  ? "error"
                  : i.severity === "warning"
                    ? "warning"
                    : "info",
              message: i.message,
            };
          }),
      ),
    );
  }, [issues, value]);
  useEffect(() => {
    const editor = view.current;
    if (!editor || !focus) return;
    const line = editor.state.doc.line(
      Math.max(1, Math.min(focus.line, editor.state.doc.lines)),
    );
    editor.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: "center" }),
    });
    editor.focus();
  }, [focus]);
  return (
    <div ref={parent} className="min-w-0 overflow-hidden rounded-lg border" />
  );
}
