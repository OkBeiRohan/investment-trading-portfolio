import FormGroup from "@/components/form/group";
import { SkeletonInput } from "@/components/form/input/skeleton";

export default function RegisterFormSkeleton() {
  return (
    <div>
      <FormGroup label="Full Name">
        <SkeletonInput />
      </FormGroup>
      <FormGroup label="Email Address">
        <SkeletonInput />
      </FormGroup>
      <FormGroup label="Password">
        <SkeletonInput />
      </FormGroup>
    </div>
  );
}
