const Page = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 2xl:grid-rows-4 gap-4">
      <div className="bg-primary-foreground p4 rounded-lg lg:col-span-2 ">
        <h1>Brivo Dashboard the place where the widgets live</h1>
      </div>
      <div className="bg-primary-foreground p4 rounded-lg lg:col-span-2"><h1>Calendar</h1></div>
      <div className="bg-primary-foreground p4 rounded-lg lg:col-span-2"><h1>Document Assistant</h1></div>
    </div>
  );
};

export default Page;
