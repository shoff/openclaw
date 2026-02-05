/**
 * Plugin Compaction Bridge Extension
 *
 * Bridges the pi-coding-agent extension system's `session_before_compact` event
 * to the OpenClaw plugin hook system's `before_compaction` / `after_compaction` hooks.
 *
 * This enables OpenClaw plugins to:
 * - Receive notification before compaction occurs (with message data)
 * - Cancel compaction by returning { cancel: true }
 * - Receive notification after compaction completes
 *
 * The bridge runs at lower priority than the compaction-safeguard extension,
 * meaning plugin hooks fire first, and if they cancel, the safeguard never runs.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getGlobalHookRunner } from "../../plugins/hook-runner-global.js";

/** Runtime state shared between the extension and external consumers. */
let bridgeSessionKey: string | undefined;

export function setPluginCompactionBridgeSessionKey(key: string | undefined): void {
  bridgeSessionKey = key;
}

export default function pluginCompactionBridgeExtension(api: ExtensionAPI): void {
  api.on("session_before_compact", async (event, _ctx) => {
    const hookRunner = getGlobalHookRunner();
    if (!hookRunner?.hasHooks("before_compaction")) {
      // No plugin hooks registered — let compaction proceed normally
      return undefined;
    }

    const { preparation } = event;
    const messageCount = preparation.messagesToSummarize?.length ?? 0;

    // Fire the plugin before_compaction hook
    const result = await hookRunner.runBeforeCompaction(
      {
        messageCount,
        tokenCount: preparation.tokensBefore,
        messages: preparation.messagesToSummarize,
      },
      {
        sessionKey: bridgeSessionKey,
      },
    );

    // If any plugin handler returned cancel: true, cancel the compaction
    if (result?.cancel) {
      return { cancel: true };
    }

    // Otherwise let compaction proceed normally (safeguard or default will handle it)
    return undefined;
  });

  // Wire after_compaction notification
  api.on("session_compact", async (event, _ctx) => {
    const hookRunner = getGlobalHookRunner();
    if (!hookRunner?.hasHooks("after_compaction")) {
      return;
    }

    await hookRunner.runAfterCompaction(
      {
        messageCount: 0, // Post-compaction message count not easily available here
        compactedCount: 0,
      },
      {
        sessionKey: bridgeSessionKey,
      },
    );
  });
}
