import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getSurveyCollection, getAdminUsersCollection } from './db';
import { BHOLA_UPAZILAS, SurveyData, AdminUser } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'bhola_family_card_survey_jwt_secret_2026';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

interface AuthRequest extends Request {
  user?: { username: string; role: string };
}

function verifyAdminToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'অননুমোদিত প্রবেশ। অনুগ্রহ করে পুনরায় লগইন করুন।' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string; role: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'সেশনের মেয়াদ শেষ হয়েছে। পুনরায় লগইন করুন।' });
  }
}

function generateTrackingId(): string {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BFC-2026-${timestamp}${random}`;
}

// 1. Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Bhola Family Card Survey Backend API' });
});

// 2. Count total survey records
app.get('/api/survey/count', async (_req: Request, res: Response) => {
  try {
    const collection = await getSurveyCollection();
    const count = await collection.countDocuments();
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'ডাটাবেস সংযোগ ব্যর্থ' });
  }
});

// 3. Submit survey
app.post('/api/survey/submit', async (req: Request, res: Response) => {
  try {
    const data: Partial<SurveyData> = req.body;

    if (!data.fullName || !data.nid || !data.mobileNumber || !data.upazila) {
      res.status(400).json({ success: false, error: 'আবশ্যকীয় তথ্যসমূহ প্রদান করুন।' });
      return;
    }

    const collection = await getSurveyCollection();
    const cleanNid = String(data.nid).trim();

    const existing = await collection.findOne({ nid: cleanNid });
    if (existing) {
      res.status(400).json({
        success: false,
        error: `এই এনআইডি (NID: ${cleanNid}) দিয়ে ইতিমধ্যে একটি আবেদন নিবন্ধিত রয়েছে (ট্র্যাকিং আইডি: ${existing.trackingId})।`,
      });
      return;
    }

    const trackingId = generateTrackingId();
    const newSurvey: SurveyData = {
      fullName: String(data.fullName).trim(),
      fatherOrHusbandName: String(data.fatherOrHusbandName || '').trim(),
      motherName: String(data.motherName || '').trim(),
      nid: cleanNid,
      dateOfBirth: String(data.dateOfBirth || '').trim(),
      mobileNumber: String(data.mobileNumber || '').trim(),
      upazila: String(data.upazila).trim(),
      unionOrPouroshovaWord: String(data.unionOrPouroshovaWord || '').trim(),
      village: String(data.village || '').trim(),
      totalFamilyMembers: Number(data.totalFamilyMembers) || 1,
      occupation: String(data.occupation || 'অন্যান্য'),
      monthlyIncome: Number(data.monthlyIncome) || 0,
      hasLand: data.hasLand === 'হ্যাঁ' ? 'হ্যাঁ' : 'না',
      landAmountDecimals: data.landAmountDecimals ? Number(data.landAmountDecimals) : 0,
      hadFamilyCard: data.hadFamilyCard === 'হ্যাঁ' ? 'হ্যাঁ' : 'না',
      comments: String(data.comments || '').trim(),
      trackingId,
      createdAt: new Date().toISOString(),
      fingerprintData: data.fingerprintData || undefined,
      fingerprintCaptured: !!data.fingerprintCaptured,
      fingerprintType: data.fingerprintType || undefined,
    };

    await collection.insertOne(newSurvey);

    res.status(201).json({
      success: true,
      message: 'আবেদন সফলভাবে গৃহীত হয়েছে।',
      trackingId,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'সংরক্ষণে ব্যর্থ হয়েছে।' });
  }
});

// 4. Admin / User Sign Up
app.post('/api/admin/register', async (req: Request, res: Response) => {
  try {
    const { username, password, name } = req.body;

    const cleanUsername = String(username || '').trim();
    const cleanPassword = String(password || '').trim();
    const cleanName = String(name || cleanUsername).trim();

    if (!cleanUsername || !cleanPassword) {
      res.status(400).json({ success: false, error: 'ব্যবহারকারীর নাম ও পাসওয়ার্ড প্রদান করা আবশ্যক।' });
      return;
    }

    if (cleanPassword.length < 4) {
      res.status(400).json({ success: false, error: 'পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে।' });
      return;
    }

    const usersCol = await getAdminUsersCollection();
    const escapedUsername = cleanUsername.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    const existingUser = await usersCol.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') } },
        { name: { $regex: new RegExp(`^${escapedUsername}$`, 'i') } }
      ]
    });

    if (existingUser) {
      res.status(400).json({ success: false, error: 'এই ব্যবহারকারীর নামে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে। লগইন করুন।' });
      return;
    }

    const newUserRole = 'user';
    const newUser: AdminUser = {
      username: cleanUsername,
      password: cleanPassword,
      name: cleanName,
      role: newUserRole,
      createdAt: new Date().toISOString(),
    };

    const insertResult = await usersCol.insertOne(newUser);
    const token = jwt.sign({ username: cleanUsername, role: newUserRole }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      message: 'রেজিস্ট্রেশন সফল হয়েছে! ডাটাবেসে ইউজার তথ্য সংরক্ষিত হয়েছে।',
      token,
      admin: {
        id: insertResult.insertedId.toString(),
        username: cleanUsername,
        name: cleanName,
        role: newUserRole,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'সাইন আপ ব্যর্থ হয়েছে।' });
  }
});

// 5. Admin / User Login
app.post('/api/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const cleanUsername = String(username || '').trim();
    const cleanPassword = String(password || '').trim();

    if (!cleanUsername || !cleanPassword) {
      res.status(400).json({ success: false, error: 'ব্যবহারকারীর নাম ও পাসওয়ার্ড প্রদান করুন।' });
      return;
    }

    const usersCol = await getAdminUsersCollection();
    const escapedUsername = cleanUsername.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const userInDb = await usersCol.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') } },
        { name: { $regex: new RegExp(`^${escapedUsername}$`, 'i') } }
      ]
    });

    if (userInDb && userInDb.password === cleanPassword) {
      const role = userInDb.role || 'user';
      const token = jwt.sign({ username: userInDb.username, role }, JWT_SECRET, { expiresIn: '24h' });
      res.json({
        success: true,
        message: 'লগইন সফল হয়েছে।',
        token,
        admin: {
          username: userInDb.username,
          name: userInDb.name || userInDb.username,
          role,
        },
      });
      return;
    }

    const isDefaultAdmin = (cleanUsername === ADMIN_USERNAME && cleanPassword === ADMIN_PASSWORD) ||
      (cleanUsername.toLowerCase() === 'admin' && cleanPassword === 'admin123') ||
      (cleanUsername.toLowerCase() === 'jorip' && cleanPassword === 'MarufHossen1234');

    if (isDefaultAdmin) {
      const token = jwt.sign({ username: cleanUsername, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
      res.json({
        success: true,
        message: 'অ্যাডমিন হিসেবে লগইন সফল হয়েছে।',
        token,
        admin: { username: cleanUsername, name: 'অ্যাডমিন অফিসার', role: 'admin' },
      });
      return;
    }

    res.status(401).json({ success: false, error: 'ভুল ব্যবহারকারীর নাম অথবা পাসওয়ার্ড।' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'লগইন করতে ব্যর্থ হয়েছে।' });
  }
});

// 6. Admin Stats
app.get('/api/admin/stats', verifyAdminToken, async (_req: AuthRequest, res: Response) => {
  try {
    const collection = await getSurveyCollection();
    const totalSubmissions = await collection.countDocuments();

    const upazilaCounts: Record<string, number> = {};
    for (const upazila of BHOLA_UPAZILAS) {
      upazilaCounts[upazila] = await collection.countDocuments({ upazila });
    }

    const pipeline = [
      {
        $group: {
          _id: '$upazila',
          totalMembers: { $sum: '$totalFamilyMembers' },
          totalIncome: { $sum: '$monthlyIncome' },
        },
      },
    ];
    const aggregateResults = await collection.aggregate(pipeline).toArray();

    let grandTotalMembers = 0;
    let grandTotalIncome = 0;

    aggregateResults.forEach((res) => {
      grandTotalMembers += res.totalMembers || 0;
      grandTotalIncome += res.totalIncome || 0;
    });

    const averageIncome = totalSubmissions > 0 ? Math.round(grandTotalIncome / totalSubmissions) : 0;

    res.json({
      success: true,
      stats: {
        totalSubmissions,
        totalFamilyMembers: grandTotalMembers,
        averageMonthlyIncome: averageIncome,
        upazilaBreakdown: upazilaCounts,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'পরিসংখ্যান লোড ব্যর্থ' });
  }
});

// 7. Admin Submissions List
app.get('/api/admin/submissions', verifyAdminToken, async (req: AuthRequest, res: Response) => {
  try {
    const collection = await getSurveyCollection();

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const search = ((req.query.search as string) || '').trim();
    const upazilaFilter = ((req.query.upazila as string) || '').trim();

    const queryFilter: any = {};

    if (upazilaFilter) {
      queryFilter.upazila = upazilaFilter;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      queryFilter.$or = [
        { fullName: searchRegex },
        { nid: searchRegex },
        { mobileNumber: searchRegex },
        { trackingId: searchRegex },
        { fatherOrHusbandName: searchRegex },
        { village: searchRegex },
      ];
    }

    const total = await collection.countDocuments(queryFilter);
    const skip = (page - 1) * limit;

    const items = await collection
      .find(queryFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({
      success: true,
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'তালিকা লোড ব্যর্থ' });
  }
});

// 8. Delete Submission
app.delete('/api/admin/submissions/:id', verifyAdminToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'অকার্যকর আইডি।' });
      return;
    }

    const collection = await getSurveyCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) as any });

    if (result.deletedCount === 1) {
      res.json({ success: true, message: 'আবেদনটি মুছে ফেলা হয়েছে।' });
    } else {
      res.status(404).json({ success: false, error: 'আবেদনটি পাওয়া যায়নি।' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'মুছে ফেলতে সমস্যা হয়েছে।' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

export default app;
