import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { User } from "../models/userSchema.js";
import { sendToken } from "../utils/jwtToken.js";
import cloudinary from "cloudinary";

const senderEmail=process.env.SENDERMAIL;
const authenticationCode=process.env.AUTHENTICATIONCODE

const getVerificationCode=()=>{
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
};

export const register = catchAsyncErrors(async (req, res, next) => {
  const nodemailer = await import('nodemailer');
  
  const transporter=nodemailer.createTransport({  
    service:'gmail',
    host:'smtp.gmail.com',
    port:587,
    secure:true,
    auth:{
        user:senderEmail,
        pass:authenticationCode,
    }
  });

  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("User Avatar Required!", 400));
  }
  const { avatar } = req.files;
  const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedFormats.includes(avatar.mimetype)) {
    return next(
      new ErrorHandler(
        "Invalid file type. Please provide your avatar in png, jpg or webp format.",
        400
      )
    );
  }
  const { name, email, password, phone, role, education } = req.body;
  if (
    !name ||
    !email ||
    !password ||
    !phone ||
    !role ||
    !education ||
    !avatar
  ) {
    return next(new ErrorHandler("Please fill full details!", 400));
  }
  let user = await User.findOne({ email });
  if (user) {
    return next(new ErrorHandler("User already existes", 400));
  }

  const cloudinaryResponse = await cloudinary.uploader.upload(
    avatar.tempFilePath
  );
  if (!cloudinaryResponse || cloudinaryResponse.error) {
    console.error(
      "Cloudinary error:",
      cloudinaryResponse.error || "Unknown cloudinary error!"
    );
  }
  const verifycode=getVerificationCode();
  const verifyLink=`http://localhost:4000/user/verify-email?token=${verifycode}`
  const activationLink={verificationLink:verifyLink};
  const mailOptions={
    from:'<noreply>activationmail.blogster@gmail.com',
    to:email,
    subject:'Blog Email Verification',
    html: `<p>Please click on the following button to verify your email address:</p>
           <a href="${verifyLink}" style="text-decoration: none;">
           <button style="background-color: #4CAF50; border: none; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 12px;">Verify</button>
           </a>`,
  };
  transporter.sendMail(mailOptions,(err,info)=>{
    if(err){
        console.log(err);
        res.status(400).json("Error in sending email");
    }
    else{
        console.log("Email Sent",info.response);
    }
  });
  user = await User.create({
    name,
    email,
    password,
    phone,
    role,
    education,
    avatar: {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    },
  });
  user.set('code',verifycode);
  user.set('activationToken',activationLink);
  sendToken(user, 200, "User registered successfully", res);
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return next(new ErrorHandler("Please fill full form!", 400));
  }
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid email or password!", 400));
  }
  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid email or password", 400));
  }
  if (user.role !== role) {
    return next(
      new ErrorHandler(`User with provided role(${role}) not found`, 400)
    );
  }
  sendToken(user, 200, "User logged in successfully", res);
});

export const verifyEmail=catchAsyncErrors((req,res)=>{
  try{
    const token=req.query.token;
    const user=User.findOne({token:token});
    if(!user){
        res.status(404).json("User Not Found");
    }
    else{
        if(user.isActive){
           return res.status(400).json("Email Already Verified");
        }
        user.set('isActive',true);
        user.save();
        res.status(200).json("Email Verified Successfully");
    }
  }
  catch(err){
    console.log(err);
    res.status(400).json(err);
  }
});

export const logout = catchAsyncErrors((req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({
      success: true,
      message: "User logged out!",
    });
});

export const getMyProfile = catchAsyncErrors((req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});

export const getAllAuthors = catchAsyncErrors(async (req, res, next) => {
  const authors = await User.find({ role: "Author" });
  res.status(200).json({
    success: true,
    authors,
  });
});
