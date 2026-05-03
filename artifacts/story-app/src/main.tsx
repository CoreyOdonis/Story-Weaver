import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { auth } from "@/lib/firebase";

setAuthTokenGetter(() => auth?.currentUser?.getIdToken() ?? null);

createRoot(document.getElementById("root")!).render(<App />);
