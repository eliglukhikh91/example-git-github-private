import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updateProfile,
  signOut,
  deleteUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase';

// Where we stash the email the user typed, so that if they open the magic
// link on the SAME device/browser we don't have to ask them to retype it.
// (If they open it on a different device, Firebase will ask them to confirm
// their email instead — this is standard behavior for email-link sign-in.)
const PENDING_EMAIL_KEY = 'luma_pending_signin_email';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  error: string | null;
  /** Sends a passwordless sign-in link to the given email. */
  sendLoginLink: (email: string) => Promise<void>;
  /** True while the current URL looks like a magic sign-in link. */
  isProcessingSignInLink: boolean;
  /** Called when the app loads and the URL is a magic sign-in link, to complete it. */
  completeSignInWithLink: (emailOverride?: string) => Promise<void>;
  /** Sets the user's display name (used once, right after their first sign-in). */
  setDisplayName: (name: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Permanently deletes the signed-in Firebase account. Throws
   * NEEDS_RECENT_LOGIN if Firebase requires a fresh sign-in first (it does
   * this for security on sensitive actions) — the caller should ask the
   * person to sign out and back in, then try again.
   */
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingSignInLink, setIsProcessingSignInLink] = useState(
    isFirebaseConfigured && !!auth && isSignInWithEmailLink(auth, window.location.href)
  );

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const sendLoginLink = async (email: string) => {
    if (!auth) throw new Error('Firebase is not configured.');
    setError(null);
    const url = new URL(window.location.href);
    url.searchParams.set('email', email);
    
    const actionCodeSettings = {
      url: url.toString(),
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem(PENDING_EMAIL_KEY, email);
  };

  const completeSignInWithLink = async (emailOverride?: string) => {
    if (!auth) throw new Error('Firebase is not configured.');
    if (!isSignInWithEmailLink(auth, window.location.href)) return;

    const url = new URL(window.location.href);
    const emailFromUrl = url.searchParams.get('email');
    const email = emailOverride || window.localStorage.getItem(PENDING_EMAIL_KEY) || emailFromUrl;
    
    if (!email) {
      // We don't know who's clicking the link (e.g. opened on a different
      // device) — the caller (LoginScreen) should ask for the email and
      // retry with emailOverride.
      setIsProcessingSignInLink(false);
      throw new Error('NEED_EMAIL');
    }

    try {
      await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem(PENDING_EMAIL_KEY);
      // Clean the sign-in params out of the URL so a refresh doesn't retry it.
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e: any) {
      setError(e?.message || 'Sign-in link is invalid or has expired.');
      throw e;
    } finally {
      setIsProcessingSignInLink(false);
    }
  };

  const setDisplayName = async (name: string) => {
    if (!auth?.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: name });
    // updateProfile() doesn't fire onAuthStateChanged, so update our local
    // copy directly. Keeping the same prototype preserves methods like
    // getIdToken(); using a new object reference is what makes React notice
    // the change and re-render.
    setUser((prev) =>
      prev ? Object.assign(Object.create(Object.getPrototypeOf(prev)), prev, { displayName: name }) : prev
    );
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  const deleteAccount = async () => {
    if (!auth?.currentUser) return;
    const uid = auth.currentUser.uid;
    try {
      await deleteUser(auth.currentUser);
    } catch (e: any) {
      if (e?.code === 'auth/requires-recent-login') {
        throw new Error('NEEDS_RECENT_LOGIN');
      }
      throw e;
    }
    // Clean up this account's locally-stored data (moments, profile prefs)
    // now that the account itself is gone.
    try {
      window.localStorage.removeItem(`luma_moments_${uid}`);
      window.localStorage.removeItem(`luma_user_profile_${uid}`);
    } catch (e) {
      // best-effort — the account is already deleted either way
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: isFirebaseConfigured,
        error,
        sendLoginLink,
        isProcessingSignInLink,
        completeSignInWithLink,
        setDisplayName,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
