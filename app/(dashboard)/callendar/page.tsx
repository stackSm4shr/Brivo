import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Page = () => {
  return (
    <div className="w-full flex justify-center p-8">
      <div className="w-full max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">Calendar</CardTitle>
          </CardHeader>

          <CardContent className="flex justify-center">
            <div className="scale-[1.3] origin-top">
              <Calendar
                fixedWeeks // 6 недель
                className="p-3"
                classNames={{
                  months:
                    "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption:
                    "flex justify-center pt-1 relative items-center text-lg font-medium",
                  table: "w-full border-collapse space-y-1",
                  head_cell:
                    "text-muted-foreground rounded-md w-10 font-normal text-[0.85rem]",
                  cell: "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                  day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 text-base",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Page;
