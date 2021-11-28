import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
import {
    PDFViewer,
    EventBus
} from 'pdfjs-dist/web/pdf_viewer';
import 'pdfjs-dist/web/pdf_viewer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const url = window.location.search.substr(3);
const container = document.querySelector('#pdf-wrapper');
const eventBus = new EventBus();
const viewer = new PDFViewer({
    container,
    eventBus
});
pdfjsLib.getDocument(url).promise.then(pdfDocument => {
    viewer.setDocument(pdfDocument);
});
