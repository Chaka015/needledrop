"use client";

import { useState } from "react";
import AddToDatabase from "./AddToDatabase";

export default function AddToDatabaseTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="ms-btn fill">
        + Add to Database
      </button>
      {open && <AddToDatabase onClose={() => setOpen(false)} />}
    </>
  );
}
