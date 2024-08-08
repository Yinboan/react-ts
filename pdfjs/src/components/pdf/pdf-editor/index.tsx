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
enum CanvasMode {
  drawing = "drawing",
  erasing = "erasing",
}
const PdfEditor = (props: IProps) => {
  const { file } = props;
  const [pages, setPages] = useState<
    {
      pdfCanvasRef: React.RefObject<HTMLCanvasElement>;
      fabricCanvasRef: React.RefObject<HTMLCanvasElement>;
    }[]
  >([]);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const pointRef = useRef<{ x: number; y: number } | null>(null);
  const allowRef = useRef(false);
  const canvasModeRef = useRef<CanvasMode | null>(null);

  const drawMosaic = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ) => {
    const mosaicSize = size;
    const blockSize = mosaicSize/2; // 单个小方块的大小

    // 保存 Canvas 状态
    ctx.save();

    // 计算马赛克方块的颜色
    const color1 = "#000000"; // 可以根据需要改变颜色
    const color2 = "#ffffff"; // 可以根据需要改变颜色

    // 绘制马赛克方块
    ctx.beginPath();
    for (let i = -mosaicSize / 2; i < mosaicSize / 2; i += blockSize) {
      // 循环从方块的左上角到右下角
      for (let j = -mosaicSize / 2; j < mosaicSize / 2; j += blockSize) {
        ctx.fillStyle = Math.random() > 0.5 ? color1 : color2;
        ctx.fillRect(x + i, y + j, blockSize, blockSize); // 绘制小方块
      }
    }
    ctx.closePath();

    // 恢复 Canvas 状态
    ctx.restore();
  };

  const bind = (canvas) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleMouseDown = (e) => {
      allowRef.current = true;
      console.log("mousedown", { e });
      pointRef.current = {
        x: e.offsetX,
        y: e.offsetY,
      };
    };

    const handleMouseMove = (e) => {
      const isDrawing = canvasModeRef.current === CanvasMode.drawing;
      const isErasing = canvasModeRef.current === CanvasMode.erasing;
      // console.log("handleMouseMove", e, isDrawing, isErasing);
      if ((!isErasing && !isDrawing) || !allowRef.current) return;
      const { x, y } = pointRef.current || {};
      // debugger;
      // 擦除
      if (isErasing) {
        ctx.clearRect(e.offsetX - 10, e.offsetY - 10, 20, 20);
      } else if (isDrawing) {
        const brushSize = 20;
        drawMosaic(ctx, x, y, brushSize);
        // ctx.beginPath();
        // ctx.moveTo(x, y);
        // ctx.lineTo(e.offsetX, e.offsetY);
        // ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
        // ctx.lineWidth = 20;
        // ctx.stroke();
      }
      pointRef.current = {
        x: e.offsetX,
        y: e.offsetY,
      };
    };

    const handleMouseUp = () => {
      allowRef.current = false;
      pointRef.current = null;
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);
  };

  // 渲染canvas
  const renderPages = async (pages ) => {
    const pdf = pdfDocRef.current
    if (!pdf)  return
    console.log("pages", pages);
    for (let i = 1; i <= pages.length; i++) {
      // 获取canvas
      const pdfCanvas = pages[i - 1].pdfCanvasRef.current!;
      const fabricCanvas = pages[i - 1].fabricCanvasRef.current!;
      if (!pdfCanvas || !fabricCanvas) return;
      // 渲染pdf
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });

      pdfCanvas.height = viewport.height;
      pdfCanvas.width = viewport.width;
      fabricCanvas.height = viewport.height;
      fabricCanvas.width = viewport.width;

      console.log("renderPages", {
        viewport,
        i,
        order: i - 1,
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
      pdfDocRef.current = pdfDoc
      const pages =  Array.from({ length: pdfDoc.numPages }, () => ({
        pdfCanvasRef: createRef(),
        fabricCanvasRef: createRef(),
      }))
      setPages( pages   );
      setTimeout(() => {
        renderPages(pages);
      });
    } else {
      alert("请上传 PDF 文件");
    }
  };

  // HOOK
  useEffect(() => {
    // console.log(pages);
    // //判断ref已经被绑定
    // if (!pages[0]?.pdfCanvasRef?.current) return;
    // debugger
    // renderPages(pdfDoc);
  }, [pages]);

  useEffect(() => {
    handleFileChange(file);
  }, [file]);

  const handleSave = () => {
    const pdf = new jsPDF();
    // 循环canvaref
    pages.forEach(({ pdfCanvasRef, fabricCanvasRef }, index) => {
      const pdfCanvas = pdfCanvasRef.current;
      const fabricCanvas = fabricCanvasRef.current;
      if (!pdfCanvas || !fabricCanvas) return;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.height = pdfCanvas.height;
      canvas.width = pdfCanvas.width;
      // merge canvas
      // 清除 Canvas 内容
      context.clearRect(0, 0, canvas.width, canvas.height);
      // 绘制第一个 Canvas 的内容
      context.drawImage(pdfCanvas, 0, 0);
      // 绘制第二个 Canvas 的内容（叠加）
      context.drawImage(fabricCanvas, 0, 0);

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
          canvasModeRef.current = CanvasMode.drawing;
        }}
      >
        添加马赛克
      </button>
      <button
        onClick={() => {
          canvasModeRef.current = CanvasMode.erasing;
        }}
      >
        擦除马赛克
      </button>
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
