import { Router } from "express";
import cloudinary from "../config/cloudinary.js";

const router = Router();

router.post("/upload", async (req, res) => {
  try {
    const { img } = req.body;
    const uploadedImage = await cloudinary.uploader.upload(img, {
      folder: "optimized_images",
      transformation: [
        {
          width: 800,
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    });
    const imgUrl = uploadedImage.secure_url;
    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      img: imgUrl,
    });
  } catch (error) {
    console.log("Error in uploading image: " + error.message);
    return res.status(500).json({
      success: false,
      error: "Image not uploaded",
    });
  }
});
router.post("/destroy", async (req, res) => {
  try {
    const { imageToRemove } = req.body;
    await cloudinary.uploader.destroy(
      imageToRemove.split("/").pop().split(".")[0]
    );
    return res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.log("Error in uploading image: " + error.message);
    return res.status(500).json({
      success: false,
      error: "Image not deleted",
    });
  }
});

export default router;
