import React, {
  createRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import * as pdfjsLib from "pdfjs-dist";
import * as fabric from "fabric";
import "./index.css";
import { PDFDocumentProxy } from "pdfjs-dist";
import { jsPDF } from "jspdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface IProps {
  file: File;
}
const PdfEditor = (props: IProps) => {
  const { file } = props;
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pages, setPages] = useState<
    {
      pdfCanvasRef: React.RefObject<HTMLCanvasElement>;
      fabricCanvasRef: React.RefObject<HTMLCanvasElement>;
    }[]
  >([]);
  const [numPages, setNumPages] = useState<number>(0);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRefs = useRef<fabric.Canvas[]>([]);
  const pointRef = useRef<{ x: number; y: number } | null>(null);
  //   const [startPos, setStartPos] = useState(null);
  const drawingRef = useRef(false);
  const erasingRef = useRef(false);

  const bind = (canvas) => {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const handleMouseDown = (e) => {
        const isDrawing = drawingRef.current;
        const isErasing = erasingRef.current;
        console.log("mousedown", e);
        pointRef.current = {
          x: e.offsetX,
          y: e.offsetY,
        };
        if (isErasing) {
          erasingRef.current = true;
        } else if (isDrawing) {
          drawingRef.current = true;
        }
      };

      const handleMouseMove = (e) => {
        const isDrawing = drawingRef.current;
        const isErasing = erasingRef.current;
        // console.log("handleMouseMove", e, isDrawing, isErasing);
        if ((!isErasing && !isDrawing) || !pointRef.current) return;
        const { x, y } = pointRef.current || {};
        // debugger;
        // 擦除
        if (isErasing) {
          ctx.clearRect(e.offsetX - 10, e.offsetY - 10, 20, 20);
        } else if (isDrawing) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(e.offsetX, e.offsetY);
          ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
          ctx.lineWidth = 20;
          ctx.stroke();
        }
        pointRef.current = {
          x: e.offsetX,
          y: e.offsetY,
        };
      };

      const handleMouseUp = () => {
        drawingRef.current = false;
        erasingRef.current = false;
      };

      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseup", handleMouseUp);
    }
  };

  // 渲染canvas
  const renderPages = async (pdf: PDFDocumentProxy) => {
    for (let i = 1; i <= pages.length; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      // 获取canvas
      const pdfCanvas = pages[i - 1].pdfCanvasRef.current!;
      const fabricCanvas = pages[i - 1].fabricCanvasRef.current!;
      pdfCanvas.height = viewport.height;
      pdfCanvas.width = viewport.width;
      fabricCanvas.height = viewport.height;
      fabricCanvas.width = viewport.width;

      console.log("renderPages", {
        viewport,
        pdfCanvas,
        fabricCanvas,
      });

      // 渲染pdf
      await page.render({
        canvasContext: pdfCanvas.getContext("2d")!,
        viewport: viewport,
      }).promise;
      // 绘制页码
      const context = pdfCanvas.getContext("2d")!;
      context.font = "20px Arial";
      context.fillStyle = "red";
      context.fillText(
        `Page ${i} of ${pdf.numPages}`,
        10,
        viewport.height - 10
      );

      // 绑定事件
      bind(fabricCanvas);
    }
  };

  const handleFileChange = async (file: File | undefined) => {
    if (file && file.type === "application/pdf") {
      const pdfDoc = await pdfjsLib.getDocument(URL.createObjectURL(file))
        .promise;

      console.log("handleFileChange", pdfDoc);
      setPdfDoc(pdfDoc);
      setNumPages(pdfDoc.numPages);
      setPages(
        Array.from({ length: pdfDoc.numPages }, () => ({
          pdfCanvasRef: createRef(),
          fabricCanvasRef: createRef(),
        }))
      );
    } else {
      alert("请上传 PDF 文件");
    }
  };

  // HOOK
  useEffect(() => {
    renderPages(pdfDoc);
  }, [pdfDoc, pages]);
  useEffect(() => {
    handleFileChange(file);
  }, [file]);

  const handleRemoveMosaic = () => {
    erasingRef.current = true;
    // fabricCanvasRefs.current.forEach((fabricCanvas) => {
    //   fabricCanvas.isDrawingMode = false; // 禁用绘图模式
    //   fabricCanvas.on("mouse:down", (opt) => {
    //     const target = opt.target;
    //     if (target) {
    //       fabricCanvas.remove(target); // 移除选中的对象
    //     }
    //   });
    // });
  };

  const handleSave = () => {
    const pdf = new jsPDF();
    pages.forEach(({ pdfCanvasRef }, index) => {
      const canvas = pdfCanvasRef.current;
      if (!canvas) return;
      const imgData = canvas.toDataURL("image/jpeg");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      if (index > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    });
    pdf.save("edited.pdf");
  };

  return (
    <div>
      <button
        onClick={() => {
          drawingRef.current = true;
        }}
      >
        添加马赛克
      </button>
      <button onClick={handleRemoveMosaic}>擦除马赛克</button>
      <button onClick={handleSave}>保存</button>
      <div ref={canvasContainerRef}>
        {pages.map((item, index) => {
          return (
            <div className="pdf-page-container" key={`${file.name}-${index}`}>
              <canvas
                className="pdf-canvas"
                ref={item?.pdfCanvasRef}
                style={{ border: "1px solid black" }}
              />
              <canvas
                className="fabric-canvas"
                ref={item?.fabricCanvasRef}
                style={{ border: "1px solid black" }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PdfEditor;
