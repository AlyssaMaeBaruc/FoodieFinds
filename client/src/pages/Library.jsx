import { useSearchParams } from "react-router-dom";
import MyMeals from "../components/MyMeals";
import FindRecipes from "../components/FindRecipes";

const VIEWS = [
  { id: "meals", label: "My meals" },
  { id: "find", label: "Find new recipes" },
];

// your saved meals, and a search for new ones. ?view=find opens the search,
// so Back and links land on the right view
function Library() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "find" ? "find" : "meals";
  const show = (id) => setSearchParams(id === "find" ? { view: "find" } : {});

  return (
    <main className="page">
      <div className="slot-toggle library-tabs" role="tablist" aria-label="Library">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            className={`slot-option${view === v.id ? " is-active" : ""}`}
            onClick={() => show(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
      {view === "find" ? <FindRecipes /> : <MyMeals onFindRecipes={() => show("find")} />}
    </main>
  );
}

export default Library;
