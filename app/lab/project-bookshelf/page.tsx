import type { Metadata } from "next";
import BookshelfDemo from "./BookshelfDemo";

export const metadata: Metadata = {
  title: "项目书架 · 独立验证",
  description: "以 3D 书架浏览三个 UI 与交互设计案例的独立交互验证。",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BookshelfDemo />;
}
