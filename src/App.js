import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";
import "./App.css";

function App() {
  const [menu, setMenu] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);

  const webcamRef = useRef();

  // Define the image URL (update the URL to point to your image)
  const imageUrls = ["/test2.jpg"]; // Update this URL

  const captureImage1 = async () => {
    const imageSrc = webcamRef?.current?.getScreenshot();
    const imgCheck = await faceapi.fetchImage(imageSrc);
    const detect = await faceapi
      .detectSingleFace(
        imgCheck,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
        })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detect) {
      alert("No face detected!");
      return;
    }

    localStorage.setItem("image", imageSrc);
    alert("Image captured!");
  };

  const captureWebcamImage = () => {
    return new Promise(async (resolve, reject) => {
      try {
        const webcamCapture = await webcamRef?.current?.getScreenshot();
        const webcamImage = await faceapi.fetchImage(webcamCapture);
        console.log("webcamImage:", webcamImage);
        resolve(webcamCapture);
      } catch (error) {
        console.error("Error capturing webcam image:", error);
        reject(error);
      }
    });
  };

  useEffect(() => {
    // Load face detection models
    (async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        await faceapi.nets.faceExpressionNet.loadFromUri("/models");
        setLoadingModels(false);
      } catch (error) {
        console.error("Error loading models:", error);
      }
    })();
  }, []);

  const captureImage = async () => {
    const imageSrc = await localStorage.getItem("image");
    if (imageSrc === null) {
      setMenu("capture");
      alert("Please capture an image first!");
      return;
    }

    const idCardImage = await faceapi.fetchImage(imageSrc);

    const idCardFacedetectionPromise = faceapi
      .detectSingleFace(
        idCardImage,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
        })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    const webcamCapture = await webcamRef?.current?.getScreenshot();

    const webcamImage = await faceapi.fetchImage(webcamCapture);

    const webcamFacedetectionPromise = faceapi
      .detectSingleFace(
        webcamImage,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
        })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    const [idCardFacedetection, webcamFacedetection] = await Promise.all([
      idCardFacedetectionPromise,
      webcamFacedetectionPromise,
    ]);

    console.log("idCardFacedetection:", idCardFacedetection);
    console.log("webcamFacedetection:", webcamFacedetection);

    if (idCardFacedetection && webcamFacedetection) {
      const distance = faceapi.euclideanDistance(
        idCardFacedetection.descriptor,
        webcamFacedetection.descriptor
      );
      console.log("Distance:", distance);
      console.log("Is matched:", distance < 0.6);

      const threshold = 0.6;
      setIsMatched(distance < threshold);
    } else {
      console.log("Face not detected in one or both images");
    }
  };

  useEffect(() => {
    let pollingInterval;

    const startPolling = async () => {
      pollingInterval = setInterval(async () => {
        try {
          if (menu === "verify" && imageUrls.length > 0) {
            await captureImage();
          }
        } catch (error) {
          console.error("Error in polling:", error);
        }
      }, 1000);
    };

    if (menu === "verify" && !loadingModels) {
      startPolling();
    } else {
      clearInterval(pollingInterval);
    }

    return () => {
      clearInterval(pollingInterval);
    };
  }, [menu, imageUrls, loadingModels]);

  return (
    <>
      <div className="container">
        <button onClick={() => setMenu("capture")}>Capture</button>
        <button onClick={() => setMenu("verify")}>Verify</button>
      </div>

      {loadingModels && <p>Loading face detection models...</p>}

      {menu === "capture" && !loadingModels && (
        <div className="gallery">
          <Webcam ref={webcamRef} />

          <button onClick={() => captureImage1()}>Capture</button>
        </div>
      )}

      {menu === "verify" && !loadingModels && (
        <div className="gallery">
          <Webcam ref={webcamRef} />

          {isMatched ? <p>Faces Matched!</p> : <p>Faces Not Matched!</p>}
        </div>
      )}
    </>
  );
}

export default App;
