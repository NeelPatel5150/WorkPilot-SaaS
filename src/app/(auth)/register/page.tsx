import { getAuthBrand } from "@/lib/auth-brand";
import { RegisterForm } from "@/features/auth/components/register-form";

export default async function RegisterPage() {
  const brand = await getAuthBrand();

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        backgroundImage: brand
          ? `radial-gradient(circle at 20% 20%, #fef08a 0%, transparent 30%), radial-gradient(circle at 80% 0%, ${brand.primaryColor}40, transparent 40%)`
          : "radial-gradient(circle at 20% 20%, #fef08a 0%, transparent 30%), radial-gradient(circle at 80% 0%, color-mix(in oklab, var(--primary) 25%, transparent), transparent 40%)",
      }}
    >
      <RegisterForm brand={brand} />
    </div>
  );
}
