import { useSectionPerf } from "@/hooks/useSectionPerf";

/** Invisible tracker used to time how long a dashboard section takes to render. */
const SectionPerf = ({ section }: { section: string }) => {
  useSectionPerf(section);
  return null;
};

export default SectionPerf;
