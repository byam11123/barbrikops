import { UserProfile } from '../types';

/**
 * Standardize phone / mobile number by stripping formatting and extracting standard 10 digits
 */
export function normalizePhone(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  // If Indian country code prefix 91 is present on 12-digit number: 91XXXXXXXXXX -> XXXXXXXXXX
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  // If leading 0 on 11-digit number: 0XXXXXXXXXX -> XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Standardize username
 */
export function normalizeUsername(rawUsername?: string | null): string {
  if (!rawUsername) return '';
  return rawUsername.trim().toLowerCase();
}

/**
 * Standardize email address
 */
export function normalizeEmail(rawEmail?: string | null): string {
  if (!rawEmail) return '';
  return rawEmail.trim().toLowerCase();
}

export interface StaffUniquenessCheckParams {
  username: string;
  phone: string;
  whatsappPhone?: string;
  email: string;
  excludeUserId?: string;
  usersList: UserProfile[];
}

export interface StaffValidationErrors {
  username?: string;
  phone?: string;
  whatsappPhone?: string;
  email?: string;
  name?: string;
}

export interface StaffValidationResult {
  isValid: boolean;
  errors: StaffValidationErrors;
  conflicts: {
    usernameUser?: UserProfile;
    phoneUser?: UserProfile;
    whatsappUser?: UserProfile;
    emailUser?: UserProfile;
  };
}

/**
 * Complete validation check for staff member uniqueness and format
 */
export function validateStaffUniqueness(params: StaffUniquenessCheckParams): StaffValidationResult {
  const { username, phone, whatsappPhone, email, excludeUserId, usersList } = params;
  const errors: StaffValidationErrors = {};
  const conflicts: StaffValidationResult['conflicts'] = {};

  const normUser = normalizeUsername(username);
  const normPhone = normalizePhone(phone);
  const normWhatsapp = normalizePhone(whatsappPhone || phone);
  const normEmail = normalizeEmail(email);

  // Filter out the staff member currently being edited
  const others = usersList.filter((u) => u.userId !== excludeUserId);

  // 1. Username Validation
  if (!normUser) {
    errors.username = 'Login username is required.';
  } else if (normUser.length < 3) {
    errors.username = 'Username must be at least 3 characters.';
  } else if (!/^[a-z0-9._-]+$/.test(normUser)) {
    errors.username = 'Username can only contain lowercase letters, numbers, periods, and hyphens.';
  } else {
    const existing = others.find((u) => normalizeUsername(u.username) === normUser);
    if (existing) {
      errors.username = `Username "${username}" is already in use by ${existing.name} (${existing.role || 'Staff'}).`;
      conflicts.usernameUser = existing;
    }
  }

  // 2. Mobile Number Validation
  if (!normPhone) {
    errors.phone = 'Mobile number is required.';
  } else if (normPhone.length < 10) {
    errors.phone = 'Mobile number must be at least 10 digits.';
  } else {
    const existing = others.find((u) => normalizePhone(u.phone) === normPhone);
    if (existing) {
      errors.phone = `Mobile number "${phone}" is already registered to ${existing.name} (${existing.role || 'Staff'}).`;
      conflicts.phoneUser = existing;
    }
  }

  // 3. WhatsApp Number Validation
  if (normWhatsapp) {
    if (normWhatsapp.length < 10) {
      errors.whatsappPhone = 'WhatsApp number must be at least 10 digits.';
    } else {
      const existing = others.find((u) => {
        const uWhat = normalizePhone(u.whatsappPhone || u.phone);
        return uWhat === normWhatsapp;
      });
      if (existing) {
        errors.whatsappPhone = `WhatsApp number "${whatsappPhone || phone}" is already registered to ${existing.name} (${existing.role || 'Staff'}).`;
        conflicts.whatsappUser = existing;
      }
    }
  }

  // 4. Email Validation
  if (!normEmail) {
    errors.email = 'Official email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
    errors.email = 'Please enter a valid email address (e.g. name@barbrik.in).';
  } else {
    const existing = others.find((u) => normalizeEmail(u.email) === normEmail);
    if (existing) {
      errors.email = `Email "${email}" is already registered to ${existing.name} (${existing.role || 'Staff'}).`;
      conflicts.emailUser = existing;
    }
  }

  const isValid = Object.keys(errors).length === 0;
  return { isValid, errors, conflicts };
}

function checkSuperAdmin(u?: UserProfile | null): boolean {
  if (!u) return false;
  return (
    u.userId === 'USR-000' ||
    u.systemRole === 'SUPER_ADMIN' ||
    u.role === 'SUPER_ADMIN' ||
    u.role === 'Super Admin' ||
    u.username === 'superadmin'
  );
}

/**
 * Filter users list based on who is viewing it.
 * Super Admin (USR-000 or role SUPER_ADMIN) account and info are hidden from all non-Super Admin users (including Admins).
 */
export function filterUsersForViewer(users: UserProfile[], viewer?: UserProfile | null): UserProfile[] {
  if (!users || !Array.isArray(users)) return [];
  if (viewer && checkSuperAdmin(viewer)) {
    return users;
  }
  return users.filter((u) => !checkSuperAdmin(u));
}

