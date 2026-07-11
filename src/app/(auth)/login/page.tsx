import { getAuthBrand } from "@/lib/auth-brand";
import { LoginForm } from "@/features/auth/components/login-form";

export default async function LoginPage() {
  const brand = await getAuthBrand();

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        backgroundImage: brand
          ? `radial-gradient(ellipse 900px 480px at 90% -10%, ${brand.primaryColor}33, transparent 55%), radial-gradient(ellipse 700px 400px at 0% 100%, ${brand.secondaryColor}, transparent 50%), linear-gradient(165deg, ${brand.secondaryColor}, #f8fafc)`
          : "radial-gradient(circle at top right, color-mix(in oklab, var(--primary) 20%, transparent), transparent 40%)",
      }}
    >
      <LoginForm brand={brand} />
    </div>
  );
}
