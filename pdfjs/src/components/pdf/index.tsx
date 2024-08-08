import React from "react";
import "./index.css";
import PdfEditor from "./pdf-editor";

const Pdf: React.FC = () => {
  const [fileList, setFileList] = React.useState<File[]>();

  return (
    <section className="pdf-container">
      <input
        type="file"
        multiple
        accept="application/pdf"
        onChange={(event) => {
          const files = event.target.files;
          console.log("onChange", files);
          setFileList((state) => [...(state || []), ...(files || [])]);
        }}
      />

      {/*Component Content*/}
      <ul>
        {fileList?.slice(-1)?.map((file) => {
          return (
            <div className="pdf-item">
              <li>
                {file.name}
                <button
                  onClick={() => {
                    setFileList((state) =>
                      state?.filter((item) => item !== file)
                    );
                  }}
                >
                  del
                </button>
              </li>
              <PdfEditor file={file} />
            </div>
          );
        })}
      </ul>
    </section>
  );
};

export default Pdf;
