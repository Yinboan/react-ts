import React from "react";
import "./index.css";

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
        {fileList?.map((file) => {
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
              <iframe
                style={{ width: "100%", height: "50vh" }}
                src={URL.createObjectURL(file)}
              />
            </div>
          );
        })}
      </ul>
    </section>
  );
};

export default Pdf;
