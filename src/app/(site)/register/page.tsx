import RegisterSelection from "@/components/features/RegisterSelection";
import { Metadata } from "next";
import { Poppins, Kaushan_Script, Yuji_Boku } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Brush script for the "Discipline Builds Character" motto
const kaushan = Kaushan_Script({
  variable: "--font-handwritten",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Brush-style kanji for the decorative 柔道 characters
const yujiBoku = Yuji_Boku({
  variable: "--font-brush-jp",
  weight: "400",
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "New Registration | TNJA",
  description: "Select your role to create a new account with Tamil Nadu Judo Association.",
};

export default function RegisterPage() {
  return (
    <div className={`${poppins.className} ${kaushan.variable} ${yujiBoku.variable}`}>
      <RegisterSelection />
    </div>
  );
}
