import Link from 'next/link';
import Image from 'next/image';

type Props = {
  href: string;
  title: string;
  description: string;
  icon: {
    src: string;
    alt: string;
  };
};

export default function DashboardTile({ href, title, description, icon }: Props) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-50 transition group-hover:bg-gray-100">
          <Image
            src={icon.src}
            alt={icon.alt}
            width={32}
            height={32}
            className="transition group-hover:scale-110"
          />
        </div>
      <div className="text-xl font-semibold tracking-tight text-gray-900 group-hover:text-blue-700">
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-gray-600">{description}</div>
      <div className="mt-4 text-sm font-medium text-blue-700">Open →</div>
    </Link>
  );
}
