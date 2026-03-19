import MentionTextarea from "./mention/MentionTextarea";
import "./App.css";
import { mentionUsers } from "./__mocks__/mentionUsers";

const App = () => {
  return (
    <div className="appPage">
      <div className="appHeader">
        <h1 className="appSubtitle">
          Введите <code>@</code> и начните печатать имя пользователя.
        </h1>
      </div>

      <div className="appCard">
        <MentionTextarea
          users={mentionUsers}
          placeholder="Например: Привет, @nik..."
        />
      </div>
    </div>
  );
};

export default App;
