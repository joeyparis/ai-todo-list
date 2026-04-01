export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <main className="p-4"><h1>List: {id}</h1></main>
}
