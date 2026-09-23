import { useState } from 'react';
import './header.css';
import axios from 'axios';

function Header() {

    let [isActive, setStatus] = useState(false);

    function handleCheckboxChange() {
        setStatus(true)
    }

    async function handleSumit(event) {

    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    formData.append('active',isActive);
    

    try {

       const file = form.elements.file?.files[0];
       const contentType = file ? file.type : '';
       console.log(contentType);

       const { data: { url, keyName } } = await axios.post(
        'https://q5gt370d2d.execute-api.us-east-1.amazonaws.com/generate-presigned-url',
         { type : contentType }
       );

    console.log(keyName);

    const s3Response = await fetch(url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type, 
      },
    });

     
       formData.append('image',keyName);
       const formJson = Object.fromEntries(formData.entries());
    

       const resposne2 = await axios.post(
        'https://q5gt370d2d.execute-api.us-east-1.amazonaws.com/item-create',
        formJson
       );

       return resposne2;

    } catch(error) {
       return error; 
    }

    }


    return (
        <section id="form-section" onSubmit={handleSumit}>
         <form action="==">
            <label htmlFor="name">Name</label>
            <input type="text" id="name" name="name" />
            <div className="checkbox-row">
                <input type="checkbox" checked={isActive} onChange={handleCheckboxChange} />
                <label htmlFor="status">Status</label>
            </div>
            <label htmlFor="file">File</label>
            <input type="file" id="file" name="file" />
            <button type="submit">Submit</button>
        </form>
        </section>
    )
}

export default Header;