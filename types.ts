export interface SurveyData {
  _id?: string;
  fullName: string;
  fatherOrHusbandName: string;
  motherName: string;
  nid: string;
  dateOfBirth: string;
  mobileNumber: string;
  upazila: string;
  unionOrPouroshovaWord: string;
  village: string;
  totalFamilyMembers: number;
  occupation: string;
  monthlyIncome: number;
  hasLand: 'হ্যাঁ' | 'না';
  landAmountDecimals?: number;
  hadFamilyCard: 'হ্যাঁ' | 'না';
  comments?: string;
  trackingId?: string;
  createdAt?: string;
  fingerprintData?: string;
  fingerprintCaptured?: boolean;
  fingerprintType?: string;
}

export interface AdminUser {
  _id?: string;
  username: string;
  password: string;
  name?: string;
  role?: string;
  createdAt?: string;
}

export const BHOLA_UPAZILAS = [
  'ভোলা সদর',
  'দৌলতখান',
  'বোরহানউদ্দিন',
  'তজুমদ্দিন',
  'লালমোহন',
  'চরফ্যাশন',
  'মনপুরা',
] as const;
