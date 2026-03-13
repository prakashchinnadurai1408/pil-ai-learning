import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminSectionContent {
  id: string;
  module_id: number | null;
  section_type: string;
  title: string;
  content: any;
  status: string;
  sort_order: number;
  created_at: string;
}

export function useAdminSectionContent(sectionType?: string) {
  const [items, setItems] = useState<AdminSectionContent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    let query = supabase
      .from("admin_section_content")
      .select("*")
      .order("created_at", { ascending: false });

    if (sectionType) {
      query = query.eq("section_type", sectionType);
    }

    const { data } = await query;
    setItems((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [sectionType]);

  return { items, loading, refetch: fetchItems };
}

export function usePublishedSectionContent(sectionType: string) {
  const [items, setItems] = useState<AdminSectionContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("admin_section_content")
        .select("*")
        .eq("section_type", sectionType)
        .eq("status", "published")
        .order("sort_order", { ascending: true });
      setItems((data as any[]) || []);
      setLoading(false);
    };
    fetch();
  }, [sectionType]);

  return { items, loading };
}
