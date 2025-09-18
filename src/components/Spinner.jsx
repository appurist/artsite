function LoadingSpinner(props) {
  const size = () => props.size || 80;
  
  return (
    <div 
      class="lds-spinner"
      style={`--spinner-size: ${size()}px;`}
    >
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
}

export default LoadingSpinner;