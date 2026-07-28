# Global Graph Search Input Rebinding Design

## Problem

Global Graph Search enters its temporary search session successfully, but a query such as `泛化` remains as Obsidian's native `file:泛化` filter and is never replaced by the plugin's one-hop exact-path filter. Reloading the plugin does not change the behavior.

The current adapter registers the `input` listener directly on the search input element immediately after graph options are patched. Obsidian may rebuild that control while applying the option change. When that happens, the listener remains attached to a detached element while the user types into the replacement element.

## Selected Approach

Register one capture-phase `input` listener on the graph view's stable container instead of on the current search input element. For each event, invoke the search-expansion callback only when the event target is the graph view's currently resolved search input.

This keeps the existing controller and expansion data flow unchanged:

1. `Ctrl+F` starts the temporary graph-search session.
2. Obsidian may replace the search input while updating graph options.
3. The stable container receives the replacement input's event.
4. The adapter verifies that the event came from the current search input.
5. The expansion controller resolves native matches and applies the one-hop exact-path filter.

## Alternatives Rejected

- Delayed direct rebinding still depends on timing and can miss later replacements.
- A `MutationObserver` can detect replacements but adds lifecycle and cleanup complexity that event delegation does not require.

## Compatibility and Failure Handling

- If the graph container cannot register DOM events, return the existing no-op disposer.
- Ignore input events from unrelated controls inside the graph view.
- Remove the delegated listener with the same capture option when the search session ends.
- Preserve all existing search, cancellation, orphan restoration, and neighbor expansion behavior.

## Testing

Add an adapter regression test that:

1. Starts listening while an initial search input is present.
2. Replaces the input returned by the graph container.
3. Dispatches a delegated event whose target is the replacement input.
4. Confirms the callback runs for the replacement input and not for unrelated targets.
5. Confirms disposal removes the container listener.

Then rebuild `main.js` and run the complete Global Graph Search test suite, JavaScript syntax checking, and the repository plugin-installation test.
