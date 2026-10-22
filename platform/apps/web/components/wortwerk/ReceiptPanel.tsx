"use client";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { encodeReceipt, parseReceipt, RECEIPT_DISCLAIMER, type CompletionReceipt } from "@/lib/wortwerk/receipts";
import { pendingAssignmentHref, PENDING_ASSIGNMENTS_KEY, readPendingAssignments, rememberAssignment, completedAssignmentIds } from "@/lib/wortwerk/challenges";
import { encodeScope, decodeScope, type PlayScope } from "@/lib/wortwerk/links";
import { useWortwerkState } from "@/lib/wortwerk/use-wortwerk";
import { wortwerkStore, type WortwerkStore } from "@/lib/wortwerk/store";
export function ReceiptPanel({ receipt }: {
    receipt: CompletionReceipt;
}) {
    const id = useId();
    const code = encodeReceipt(receipt);
    const [message, setMessage] = useState("");
    async function copy() {
        try {
            if (!navigator.clipboard?.writeText) {
                setMessage("Select the result code to copy it.");
                return;
            }
            await navigator.clipboard.writeText(code);
            setMessage("Result code copied.");
        }
        catch {
            setMessage("Copy was unavailable. Select the result code to copy it.");
        }
    }
    function download() {
        let href: string | undefined;
        try {
            const blob = new Blob([`${code}\n\n${RECEIPT_DISCLAIMER}\n`], { type: "text/plain;charset=utf-8" });
            href = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = href;
            anchor.download = "wortwerk-receipt.txt";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setMessage("Result code downloaded.");
        }
        catch {
            setMessage("Download was unavailable. You can copy the code instead.");
        }
        finally {
            if (href) {
                const completedHref = href;
                setTimeout(() => URL.revokeObjectURL(completedHref), 1000);
            }
        }
    }
    return <section className="ww-receipt" aria-labelledby={id}>
    <h2 id={id}>Your result code</h2>
    <p>{receipt.correct} of {receipt.answered} answers recorded.</p>
    <p>{RECEIPT_DISCLAIMER}</p>
    <label>Result code<textarea readOnly value={code} rows={4} onFocus={event => event.currentTarget.select()} style={{ width: "100%", boxSizing: "border-box", minHeight: 88, overflowWrap: "anywhere" }}/></label>
    <div><button className="ww-button" type="button" onClick={() => { void copy(); }}>Copy result code</button><button className="ww-button" type="button" onClick={download}>Download result code</button></div>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
/** Student-side task list. Assignment creation and delivery belong to Lane 3. */
export function AssignmentCard() {
    const { snapshot, now } = useWortwerkState();
    const assignments = readPendingAssignments(snapshot.docs.find(doc => doc.key === PENDING_ASSIGNMENTS_KEY && doc.schemaVersion === 1)?.value);
    const completed = completedAssignmentIds(snapshot.events, now);
    const pending = assignments.filter(assignment => !completed.has(assignment.assignmentId));
    if (!pending.length)
        return null;
    return <section className="ww-assignments" aria-label="Your assignments"><h2>Assigned practice</h2>
    <ul>{pending.map(assignment => <li key={assignment.assignmentId} style={{ overflowWrap: "anywhere" }}><Link className="ww-button" href={pendingAssignmentHref(assignment)}>Continue assignment {assignment.assignmentId}</Link></li>)}</ul>
  </section>;
}
/** Mount on a results screen: no result code is generated until the learner asks. */
export function ReceiptButton({ receipt }: {
    receipt: CompletionReceipt;
}) {
    const [requested, setRequested] = useState(false);
    const [message, setMessage] = useState("");
    return requested ? <ReceiptPanel receipt={receipt}/> : <section aria-label="Signed-out result code">
        <button className="ww-button" type="button" onClick={() => {
            try {
                parseReceipt(receipt);
                setRequested(true);
            }
            catch {
                setMessage("A result code is unavailable for these results.");
            }
        }}>Create a result code</button>
        <p role="status" aria-live="polite">{message}</p>
    </section>;
}
/** Mount once a run has started; the idempotent effect saves a task for Today. */
export function AssignmentMemory({ assignmentId, scope, packId, store = wortwerkStore }: {
    assignmentId?: string;
    scope: PlayScope;
    packId?: string;
    store?: WortwerkStore;
}) {
    const encoded = encodeScope(scope);
    const [message, setMessage] = useState("");
    const persist = useCallback(() => {
        if (!assignmentId)
            return;
        try {
            rememberAssignment(decodeScope(encoded), assignmentId, store, packId);
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : "This assignment could not be added to Today.");
        }
    }, [assignmentId, encoded, packId, store]);
    useEffect(() => { persist(); }, [persist]);
    return message ? <p role="status">{message}</p> : null;
}
