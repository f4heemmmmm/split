type Props = { name: string; color: string };

export default function Chip({ name, color }: Props) {
  return <span className={`chip chip-${color}`}>{name}</span>;
}
