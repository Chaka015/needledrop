"use client";

import { useState, useEffect } from "react";
import AddToDatabase from "./AddToDatabase";

interface Props {
  autoOpen?: boolean;
  initialQuery?: string;
}

export default function AddToDatabaseTrigger({ autoOpen, initialQuery }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="ms-btn fill">
        + Add to Database
      </button>
      {open && <AddToDatabase onClose={() => setOpen(false)} initialQuery={initialQuery} />}
    </>
  );
}
