import { Button } from "@mui/joy";
import { StateCard } from "@/features/patch-analysis/components";

export default function NotFound() {
  return (
    <StateCard
      action={
        <Button component="a" href="/" size="sm" variant="soft">
          메인으로 이동
        </Button>
      }
      description="주소가 바뀌었거나 아직 준비되지 않은 화면일 수 있습니다."
      title="페이지를 찾을 수 없습니다."
    />
  );
}
