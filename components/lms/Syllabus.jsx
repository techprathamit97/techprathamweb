export default function Syllabus({ topics = [] }) {
  return (
    <section>
      <h2>Syllabus</h2>
      <ul>
        {topics.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </section>
  );
}
