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
      canvasRef: React.RefObject<HTMLCanvasElement>;
      fabricCanvas: fabric.Canvas | null;
      bgImg: any;
    }[]
  >([]);
  const [numPages, setNumPages] = useState<number>(0);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRefs = useRef<fabric.Canvas[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const renderPages = async (pdf: PDFDocumentProxy) => {
    for (let i = 1; i <= pages.length; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      // 获取canvas
      const canvas = pages[i - 1].canvasRef.current!;
      const context = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      console.log("renderPages", canvas, i, pages.length);

      // 渲染pdf
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // 绘制页码
      context.font = "20px Arial";
      context.fillStyle = "red";
      context.fillText(
        `Page ${i} of ${pdf.numPages}`,
        10,
        viewport.height - 10
      );

      // Initialize Fabric.js canvas for each page
      const fabricCanvas = new fabric.Canvas(canvas);
      fabricCanvas.isDrawingMode = true; // 启用绘图模式
      fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas); // 设置画笔
      pages[i - 1].fabricCanvas = fabricCanvas;
      // 使用 fabric.util.loadImage 加载图像
      // 将 PDF Canvas 内容转换为 Data URL
      const dataUrl = canvas.toDataURL();
      // 使用 Fabric.js 将 PDF Canvas 内容添加到 Fabric 画布
      fabric.Image.fromURL(dataUrl, (fabricImage: any) => {
        fabricCanvas.add(fabricImage);
        fabricCanvas.setHeight(viewport.height);
        fabricCanvas.setWidth(viewport.width);
        fabricCanvas.renderAll(); // 渲染 Fabric 画布
      });

      //   fabric.util.loadImage(canvas.toDataURL(), (img) => {
      //     const fabricImage = new fabric.Image(img, {
      //       scaleX: fabricCanvas.width / img.width,
      //       scaleY: fabricCanvas.height / img.height,
      //     });
      //     // 直接设置背景图像
      //     fabricCanvas.backgroundImage = fabricImage;
      //     fabricCanvas.renderAll(); // 重新渲染画布
      //   });

      //   // 监听路径创建事件
      fabricCanvas.on("path:created", (e) => {
        console.log("path:created", e);

        const path = e.path;
        const rect = new fabric.Rect({
          left: path.left,
          top: path.top,
          fill: "rgba(0, 0, 0, 0.5)",
          width: path.width,
          height: path.height,
        });
        fabricCanvas.remove(path);
        fabricCanvas.add(rect);
      });
    }
  };

  const handleFileChange = async (file: File | undefined) => {
    if (file && file.type === "application/pdf") {
      const pdfDoc = await pdfjsLib.getDocument(URL.createObjectURL(file))
        .promise;
      setPdfDoc(pdfDoc);
      setNumPages(pdfDoc.numPages);
      setPages(
        Array.from({ length: pdfDoc.numPages }, () => ({
          canvasRef: createRef(),
          fabricCanvas: null,
          bgImg: null,
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

  //   useEffect(() => {
  //     if (pdf && canvasContainerRef.current) {
  //       const renderPages = async () => {
  //         const container = canvasContainerRef.current!;
  //         container.innerHTML = ""; // 清空容器
  //         fabricCanvasRefs.current = [];

  //         for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
  //           const page = await pdf.getPage(pageNum);
  //           const viewport = page.getViewport({ scale: 2 });

  //           // 初始化canvas
  //           const canvas = document.createElement("canvas");
  //           canvas.classList.add("canvas-page");
  //           const context = canvas.getContext("2d")!;
  //           canvas.height = viewport.height;
  //           canvas.width = viewport.width;

  //           // 创建 Fabric.js Canvas
  //           const fabricCanvas = new fabric.Canvas(canvas);
  //           fabricCanvasRefs.current.push(fabricCanvas);

  //           // 渲染pdf
  //           const renderContext = {
  //             canvasContext: context,
  //             viewport: viewport,
  //           };
  //           await page.render(renderContext).promise;
  //           context.font = "20px Arial";
  //           context.fillStyle = "red";
  //           context.fillText(
  //             `Page ${pageNum} of ${pdf.numPages}`,
  //             10,
  //             viewport.height - 10
  //           );

  //           // 将渲染的内容作为图像添加到 Fabric.js Canvas 的背景中
  //           //   const imgData = canvas.toDataURL("image/png");
  //           //   fabric.util.Image.fromURL(imgData, (img) => {
  //           //     fabricCanvas.setBackgroundImage(
  //           //       img,
  //           //       fabricCanvas.renderAll.bind(fabricCanvas)
  //           //     );
  //           //   });

  //           //    添加dom
  //           container.appendChild(canvas);
  //           //  添加事件监听器
  //           fabricCanvas.on("mouse:down", (opt) => {
  //             const pointer = fabric.util.getPointer(opt.e);
  //             setIsDrawing(true);
  //             setStartPos({ x: pointer.x, y: pointer.y });
  //           });
  //           fabricCanvas.on("mouse:move", (opt) => {
  //             console.log("mouse:move", opt);

  //             if (!isDrawing || !startPos) return;
  //             const pointer = fabric.util.getPointer(opt.e);
  //             const rect = new fabric.Rect({
  //               left: startPos.x,
  //               top: startPos.y,
  //               width: pointer.x - startPos.x,
  //               height: pointer.y - startPos.y,
  //               fill: "rgba(0, 0, 0, 0.5)",
  //             });
  //             fabricCanvas.add(rect);
  //             fabricCanvas.renderAll();
  //           });

  //           fabricCanvas.on("mouse:up", () => {
  //             setIsDrawing(false);
  //             setStartPos(null);
  //           });
  //         }
  //       };

  //       renderPages();
  //     }
  //   }, [pdf, isDrawing, startPos]);

  const handleRemoveMosaic = () => {
    fabricCanvasRefs.current.forEach((fabricCanvas) => {
      fabricCanvas.isDrawingMode = false; // 禁用绘图模式
      fabricCanvas.on("mouse:down", (opt) => {
        const target = opt.target;
        if (target) {
          fabricCanvas.remove(target); // 移除选中的对象
        }
      });
    });
  };

  return (
    <div>
      <button onClick={() => setIsDrawing(true)}>添加马赛克</button>
      <button onClick={handleRemoveMosaic}>擦除马赛克</button>
      <div ref={canvasContainerRef}></div>

      {pages.map((item, index) => {
        return (
          <>
            <canvas
              ref={item?.canvasRef}
              style={{ border: "1px solid black" }}
            />
          </>
        );
      })}
    </div>
  );
};

export default PdfEditor;
