# Bhola District Family Card Survey - Backend API

ভোলা জেলা ফ্যামিলি কার্ড জরিপ ব্যবস্থার এক্সপ্রেস ব্যাকএন্ড সার্ভার।

## বৈশিষ্ট্য (Features)
- MongoDB Cluster Connection
- Express REST API with CORS enabled
- JWT Authentication for Admin/User
- Survey submission & tracking ID generation
- Admin Dashboard Statistics & Submission Management

## কিভাবে Vercel-এ Backend লাইভ করবেন:
1. Vercel dashboard (`https://vercel.com/new`) এ যান।
2. আপনার GitHub রিপোজিটরি থেকে `backend` ফোল্ডার সিলেক্ট করুন (বা আলাদা রিপোজিটরি তৈরি করে সেখানে ব্যাকএন্ড পুশ করুন)।
3. **Environment Variables** সেকশনে নিচের ভ্যালুগুলো দিন:
   - `MONGODB_URI`: `mongodb+srv://jorip:MarufHossen1234@cluster0.a87xhva.mongodb.net/jorip?retryWrites=true&w=majority&appName=Cluster0`
   - `JWT_SECRET`: `bhola_family_card_survey_jwt_secret_2026`
   - `ADMIN_USERNAME`: `admin`
   - `ADMIN_PASSWORD`: `admin123`
4. **Deploy** বাটনে ক্লিক করুন।
5. ডেপ্লয়মেন্ট শেষে ব্যাকএন্ডের ডোমেইন লিংক (যেমন: `https://your-backend.vercel.app`) কপি করুন।
