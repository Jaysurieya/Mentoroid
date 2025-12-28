import React from "react";
import { motion } from "framer-motion";
import { Button } from "./Button";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import { ChevronLeftIcon, GithubIcon, GraduationCap } from "lucide-react";
import { Input } from "./Input";
import {cn} from "../../lib/utils";

export function AuthPage() {

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [isAuthProcessing, setIsAuthProcessing] = React.useState(false);
  const [authError, setAuthError] = React.useState(null);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      console.log("clicked");
      setIsAuthProcessing(true);
      setAuthError(null);

      const result = await signInWithPopup(auth, googleProvider);

      // 🔑 Firebase ID token
      const idToken = await result.user.getIdToken();

      // 📡 Send token to backend
      const res = await fetch("http://localhost:5000/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: idToken }),
      });

      const data = await res.json();
      console.log(data);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Google signup failed");
      }

      // 🪙 Save JWT and navigate based on user status
      localStorage.setItem("fitmate_token", data.token);
      setShowSuccess(true);
      if (data.isNewUser) {
        navigate("/details");
      } else {
        navigate("/dashboard");
      }

    } catch (error) {
      setAuthError(error?.message || 'Google signup failed');
    } finally {
      setIsAuthProcessing(false);
    }
};

  const handleEmailAuth = async () => {
      try {
        setIsAuthProcessing(true);
        setAuthError(null);

        const res = await fetch("http://localhost:5000/api/auth/email-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        console.log(data);

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Authentication failed");
        }

        localStorage.setItem("fitmate_token", data.token);

        if (data.isNewUser) {
          navigate("/details");      // 🆕 new user
        } else {
          navigate("/dashboard");   // 👤 existing user
        }

      } catch (err) {
        setAuthError(err.message || 'Authentication failed');
      } finally {
        setIsAuthProcessing(false);
      }
  };

  return (
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      <div className="bg-muted/60 relative hidden h-full flex-col border-r p-10 lg:flex">
        <div className="from-background absolute inset-0 z-10 bg-gradient-to-t to-transparent" />
        <div className="z-10 flex items-center gap-2">
          <GraduationCap className="size-6" />
          <p className="text-xl font-semibold">Mentoroid</p>
        </div>
        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl">
              &ldquo;Give your textbooks a voice.
              Discover the answers hidden in plain sight, just by having a conversation.&rdquo;
            </p>
            <footer className="font-mono text-sm font-semibold">~ Mentoroid</footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>
      <div className="relative flex min-h-screen flex-col justify-center p-4">
        <div
          aria-hidden
          className="absolute inset-0 isolate contain-strict -z-10 opacity-60"
        >
          <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)] absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full" />
          <div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 right-0 h-320 w-60 [translate:5%_-50%] rounded-full" />
          <div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 right-0 h-320 w-60 -translate-y-87.5 rounded-full" />
        </div>
        <Button variant="ghost" className="absolute top-7 left-5" asChild>
          <a href="#">
            <ChevronLeftIcon className="size-4 me-2" />
            Home
          </a>
        </Button>
        <div className="mx-auto space-y-4 sm:w-sm">
          <div className="flex items-center gap-2 lg:hidden">
            <GraduationCap className="size-6" />
            <p className="text-xl font-semibold">Mentoroid</p>
          </div>
          <div className="flex flex-col space-y-1">
            <h1 className="font-heading text-2xl font-bold tracking-wide">
              Sign In or Join Now!
            </h1>
            <p className="text-muted-foreground text-base">
              login or create your Mentoroid account.
            </p>
          </div>
          <div className="space-y-2">
            <Button type="button" size="lg" className="w-full bg-black" onClick={handleGoogleLogin}>
              <GoogleIcon className="size-4 me-2" color="white"/>
              <span style={{color:"white"}}>Continue with Google</span>
            </Button>
            <Button type="button" size="lg" className="w-full bg-black">
              <GithubIcon className="size-4 me-2" color="white"/>
              <span style={{color:"white"}}>Continue with GitHub</span>
            </Button>
          </div>

          <AuthSeparator />

          <form className="space-y-2">
            <p className="text-muted-foreground text-start text-xs">
              Enter your email address to sign in or create an account
            </p>
            <div className="relative h-max">
              <div style={{ paddingBottom: "0.5rem" }}>
                <Input
                  placeholder="your.email@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isAuthProcessing}
                />
              </div>
              <Input
                placeholder="your password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isAuthProcessing}
              />
            </div>

            <Button 
            type="button" 
            className="w-full bg-black"
            onClick={handleEmailAuth}
            disabled={isAuthProcessing}
            style={{ cursor: "pointer" }}
            >
              <span style={{color:"white"}}>Continue With Email</span>
            </Button>
          </form>
          <p className="text-muted-foreground mt-8 text-sm">
            By clicking continue, you agree to our{" "}
            <a
              href="#"
              className="hover:text-primary underline underline-offset-4"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="hover:text-primary underline underline-offset-4"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

function FloatingPaths({ position }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    color: `rgba(15,23,42,${0.1 + i * 0.03})`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-slate-950 dark:text-black"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}
const GoogleIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <g>
      <path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669   C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62   c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401   c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
    </g>
  </svg>
);

const AuthSeparator = () => {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="bg-border h-px w-full" />
      <span className="text-muted-foreground px-2 text-xs">OR</span>
      <div className="bg-border h-px w-full" />
    </div>
  );
};
