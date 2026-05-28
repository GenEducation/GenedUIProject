import { GlobalWorkerOptions } from "pdfjs-dist";

// Configure pdfjs to use the locally served worker file.
// The worker is copied to /public during postinstall.
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
