export default function ListPage({ params }: { params: { id: string } }) {
  return <main className="p-4"><h1>List: {params.id}</h1></main>
}
