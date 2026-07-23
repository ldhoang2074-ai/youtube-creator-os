import { ChannelCompareClient } from "@/components/channel-compare/ChannelCompareClient";

export default function ComparePage() {
  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-ui-6">
      <ChannelCompareClient />
    </div>
  );
}
