import { Card, CardContent } from "../ui/Card";

const SkeletonCard = () => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-6 animate-pulse">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted" />
      <div className="h-5 w-3/4 mx-auto bg-muted rounded mb-2" />
      <div className="h-4 w-1/2 mx-auto bg-muted rounded mb-6" />
      <div className="h-9 w-28 mx-auto bg-muted rounded" />
    </CardContent>
  </Card>
);

export default SkeletonCard;