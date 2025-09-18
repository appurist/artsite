function Footer(props) {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="main-footer">
      <p>
        Version {props.version}
        &mdash; Copyright &copy; {currentYear} by <a href="https://artsite.ca">artsite.ca</a>.
        Artworks shown are copyright by their respective owner.
      </p>
    </footer>
  );
}

export default Footer;