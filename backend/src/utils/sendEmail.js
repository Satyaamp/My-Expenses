const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {

    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing in environment variables");
    }

    const resend = new Resend(process.env.RESEND_API_KEY);


    const { data, error } = await resend.emails.send({
      from: "DhanRekha <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    if (error) {
      console.error("❌ Resend API Error:", error);
      throw new Error(error.message);
    }

    console.log("✅ Email sent successfully", data);
    return data;
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw new Error("Email could not be sent");
<<<<<<< HEAD
    throw new Error(error.message || "Email could not be sent");
=======
>>>>>>> 17e6192f785849939848fd6e5e40a8a99c6d9f64
  }
};

module.exports = { sendEmail };